const bodyParser = require('body-parser');
const express = require('express');
const app = express();

const months = [ 'Jan.', 'Feb.', 'Mar.', 'Apr.', 'May ', 'Jun.', 'Jul.', 'Aug.', 'Sep.', 'Oct.', 'Nov.', 'Dec.' ];

app.use(bodyParser.json());

app.post('/webhooks/:token', (request) => {
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
    request.params.token === process.env[token + '-' + request.body.repository.name]
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
    exec('docker stop ' + request.body.repository.name, (err) => {
      if (err) {
        console.error('[Error] docker stop:', err);
      }
      exec('docker rm ' + request.body.repository.name, (err2) => {
        if (err2) {
          console.error('[Error] docker rm:', err2);
        }
        exec('docker rmi ' + request.body.repository.repo_name, (err3) => {
          if (err3) {
            console.error('[Error] docker rmi:', err3);
          }
          exec(
            'docker run ' +
            '--detach ' +
            '--label traefik.docker.network=' + process.env.network + ' ' +
            '--name ' + request.body.repository.name + ' ' +
            '--network ' + process.env.network + ' ' +
            '--restart always ' +
            request.body.repository.repo_name,
            (err4) => {
              if (err4) {
                console.error('[Error] docker run:', err4);
              }
            }
          );
        });
      });
    });
  }
  else {
    console.warn('[Error]', request.params.token, request.body);
  }
});

app.listen(80);
