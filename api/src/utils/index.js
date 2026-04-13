const pace = require('./pace');
const motivation = require('./motivation');
const constants = require('./constants');

module.exports = {
  ...pace,
  ...motivation,
  ...constants
};
