class AbstractChat {
  constructor() {
    if (this.constructor === AbstractChat) {
      throw new Error('Abstract class cannot be instantiated');
    }
  }

  start() {
    throw new Error('Method start() must be implemented');
  }

  sendMessage(chatId, text) {
    throw new Error('Method sendMessage() must be implemented');
  }

  onMessage(callback) {
    throw new Error('Method onMessage() must be implemented');
  }
}

module.exports = AbstractChat;