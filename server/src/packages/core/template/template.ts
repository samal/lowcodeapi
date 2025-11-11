import fs from 'fs';
import path from 'path';
import _ from 'lodash';

const html = './html';

function readFile(file: string): string {
  const filePath = path.join(__dirname, html, file);
  return fs.readFileSync(filePath, 'utf8');
}

interface FileJson {
  [key: string]: string;
}

interface Theme {
    [key: string]: {
      html: string;
    };
  }

const fileJson: FileJson = {
  'email/layout': 'email_layout.html',
  'email/layout_css': 'email_layout.css',
  'email/layout_v2': 'email_layout_v2.html',
  'email/bodycontent': 'email_body_content.html',
  'email/partials/layout_header': 'email_layout_header.html',
  'email/partials/content_layout': 'email_content_layout.html',
  'email/partials/content_header': 'email_content_header.html',
  'email/partials/content_footer': 'email_content_footer.html',
  'email/login_link': 'login-link.html',
  'email/email_verify': 'email-verify.html',
};

const json: FileJson = {};
const theme : Theme = {};

_.each(fileJson, (value, key) => {
  json[key] = readFile(value);
  theme[key] = {
    html: readFile(value),
  };
});

export { fileJson, json, theme };
