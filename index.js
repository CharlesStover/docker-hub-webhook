const bodyParser = require('body-parser');
const express = require('express');
const app = express();

const months = [ 'Jan.', 'Feb.', 'Mar.', 'Apr.', 'May ', 'Jun.', 'Jul.', 'Aug.', 'Sep.', 'Oct.', 'Nov.', 'Dec.' ];

app.use(bodyParser.json());

app.post('/webhooks/:token', (request, response) => {
  if (
    typeof request.body === 'object' &&
    request.body !== null &&
    !Array.isArray(request.body) &&
    Object.prototype.hasOwnProperty.call(request.body, 'push_data') &&
    typeof request.body.push_data.pushed_at === 'number' &&
    typeof request.body.push_data.pusher === 'string' &&
    typeof request.body.push_data.tag === 'string' &&
    Object.prototype.hasOwnProperty.call(request.body, 'repository') &&
    typeof request.body.repository.is_official === 'boolean' &&
    typeof request.body.repository.is_private === 'boolean' &&
    typeof request.body.repository.is_trusted === 'boolean' &&
    typeof request.body.repository.name === 'string' &&
    /^[\d\w]+$/.test(request.body.repository.name) &&
    typeof request.body.repository.repo_name === 'string' &&
    /^[\d\w]+\/[\d\w]+$/.test(request.body.repository.repo_name) &&
    Object.prototype.hasOwnProperty.call(process.env, 'token-' + request.body.repository.name) &&
    request.params.token === process.env['token-' + request.body.repository.name]
  ) {
    const meta = [ ];
    if (request.body.repository.is_official) {
      meta.push('official');
    }
    if (request.body.repository.is_private) {
      meta.push('private');
    }
    if (request.body.repository.is_trusted) {
      meta.push('trusted');
    }
    const when = new Date(request.body.push_data.pushed_at * 1000);
    const day = when.getDate();
    const hours = when.getHours();
    const minutes = when.getMinutes();
    console.log(
      '[' + when.getFullYear() + ' ' + months[when.getMonth()] + ' ' + (day < 10 ? '0' : '') + day + ' ' +
      (hours < 10 ? '0' : '') + hours + ':' + (minutes < 10 ? '0' : '') + minutes + '] ' +
      request.body.repository.repo_name + ':' + request.body.push_data.tag + ' by ' +
      request.body.push_data.pusher +
      (
        meta.length > 0 ?
          ' (' + meta.join(', ') + ')' :
          ''
      )
    );
    exec('docker pull ' + request.body.repo_name, errPull => {
      if (errPull) {
        console.error('[Error] docker pull:', errPull);
        response.end();
        return;
      }
      exec('docker stop ' + request.body.repository.name, errStop => {
        if (errStop) {
          console.error('[Error] docker stop:', errStop);
          response.end();
          return;
        }
        exec('docker rm ' + request.body.repository.name, errRm => {
          if (errRm) {
            console.error('[Error] docker rm:', errRm);
            response.end();
            return;
          }
          exec('docker rmi ' + request.body.repository.repo_name, errRmi => {
            if (errRmi) {
              console.error('[Error] docker rmi:', errRmi);
              response.end();
              return;
            }
            exec(
              'docker run ' +
              '--detach ' +
              '--name ' + request.body.repository.name + ' ' +
              '--network ' + process.env.network + ' ' +
              '--restart always ' +
              '--volume /var/log/docker/' + request.body.repository.name + ':/var/log/apache2 ' +
              '--volume /var/log/docker/' + request.body.repository.name + ':/var/log/nginx ' +
              request.body.repository.repo_name,
              errRun => {
                if (errRun) {
                  console.error('[Error] docker run:', errRun);
                }
                response.end();
              }
            );
          });
        });
      });
    });
  }
  else {
    console.warn('[Error]', request.params.token, request.body);
    response.end();
  }
});

app.listen(80);
