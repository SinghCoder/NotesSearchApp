pragma page_size = 4096;
-- 1024: db.sqlite3 total bytes fetched: 71632 total requests: 48
-- 4096: db.sqlite3 total bytes fetched: 98286 total requests: 18

-- attach database 'data/youtube-metadata-pg4096.sqlite3' as ytm;

CREATE TABLE notes (id integer primary key autoincrement, path text not null);
CREATE TABLE tags (id integer primary key autoincrement, tag text not null);
CREATE TABLE note_tag (tagid integer, noteid integer, FOREIGN KEY (tagid) REFERENCES tags(id), FOREIGN KEY (noteid) REFERENCES notes(id));

INSERT INTO notes (path) VALUES ('https://www.sqlitetutorial.net/sqlite-foreign-key/');
INSERT INTO tags (tag) VALUES ('sqlite');
INSERT INTO note_tag (tagid, noteid) VALUES (1, 1);

-- insert into authors (name) select author from ytm.videoData group by author having count(*) >= 3; -- authors with at least 3 vids in database

-- create table videoData as select * from ytm.videoData order by author; -- important to sort here so it can be fetched quickly by author;

-- create index videoData_author on videoData(author);

-- CREATE TABLE "sponsorTimes" (
--         "videoID"       TEXT NOT NULL,
--         "startTime"     REAL NOT NULL,
--         "endTime"       REAL NOT NULL,
--         "votes" INTEGER NOT NULL,
--         "category" TEXT NOT NULL,
--         "shadowHidden"  INTEGER NOT NULL,
--         "authorID"      INTEGER);

-- CREATE INDEX "sponsorTimes_videoID" ON "sponsorTimes" ("videoID");
-- CREATE INDEX sptauth on sponsorTimes(authorID);

-- insert into sponsorTimes
-- select s.videoID, s.startTime, s.endTime, s.votes, s.category, s.shadowHidden, authors.id
-- from ytm.sponsorTimes s
-- join ytm.videoData v on v.videoID = s.videoID
-- join authors on authors.name = v.author
-- order by authors.id, s.videoID, s.startTime;

create virtual table tags_search using fts5(tag, content=tags, content_rowid=id);
insert into tags_search(rowid, tag) select id, tag from tags;

vacuum;