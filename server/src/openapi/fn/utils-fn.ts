const sanitize = (text: any) => text.toString().toLowerCase().trim().replaceAll(':', '')
  .replaceAll('/', '')
  .split(' ')
  .filter((i: any) => !!i)
  .join('-');

export default sanitize;
