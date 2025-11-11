import random from './generate';

/*
r - regular user
s - surrogate user (belongs to an organization with not login details, email belongs to the org)
b - business user (business account who will have more privillges)

*/
const id = (prefix?: string, type = 'r'): string => {
  const prefixLocal = (prefix || 'usr').toString().toLowerCase();
  const gen_id = random.nano()
    .toString()
    .replace('-', 'lx')
    .replace('_', 'ly')
    .toUpperCase();

  return `${prefixLocal}_${type}${gen_id}`;
};

export default id;
