export function createDuplicateDetector(db) {
  return {
    async check(title, artist, url) {
      return new Promise((resolve, reject) => {
        db.get(
          'SELECT id FROM songs WHERE (title = ? AND artist = ?) OR url = ?',
          [title, artist, url],
          (err, row) => {
            if (err) reject(err);
            else resolve({
              isDuplicate: !!row,
              existingId: row?.id
            });
          }
        );
      });
    }
  };
}
