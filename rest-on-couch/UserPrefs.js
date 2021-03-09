define(function () {
  class UserPrefs {
    constructor(roc) {
      this.roc = roc;
    }
    /**
     * Retrieves user preferences related to the current view
     * @return {object} preferences
     */
    async get() {
      let record = await this.getRecord();
      if (record && record.$content) return record.$content;
      return undefined;
    }

    async getRecord() {
      var user = await this.roc.getUser();
      if (!user || !user.username) return undefined;
      var firstEntry = (
        await this.roc.view('entryByOwnerAndId', {
          key: [user.username, 'userPrefs'],
        })
      )[0];
      return firstEntry;
    }

    async set(value) {
      let record = await this.getRecord();
      if (record) {
        record.$content = value;
        return this.roc.update(record);
      } else {
        return this.roc.create({
          $id: ['userPrefs'],
          $content: value,
          $kind: 'userPrefs',
        });
      }
    }
  }
  return UserPrefs;
});
