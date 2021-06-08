import { observer, useLocalObservable } from "mobx-react";
import * as React from "react";
import { Database } from "sql.js";
import {
  notesSearch,
  createDbWorker,
  // getForAuthor,
  // SponsorInfo,
  SqliteWorker,
  Note,
  Tag,
  tagsSearch
  // VideoMeta,
} from "./db";
import { action, makeAutoObservable, makeObservable, observable } from "mobx";
import AsyncSelect from "react-select/async";
import debounce from "debounce-promise";
// import createPlotlyComponent from "react-plotly.js/factory";
// import Plotly from "plotly.js/lib/core";
import { textChangeRangeIsUnchanged } from "typescript";

// const Plot = createPlotlyComponent(Plotly);

function formatDuration(sec_num: number) {
  const hours = Math.floor(sec_num / 3600);
  const minutes = Math.floor((sec_num - hours * 3600) / 60);
  const seconds = Math.round(sec_num - hours * 3600 - minutes * 60);

  return (
    String(hours).padStart(2, "0") +
    ":" +
    String(minutes).padStart(2, "0") +
    ":" +
    String(seconds).padStart(2, "0")
  );
}
// const SponsorPlot: React.FC<{
//   data: SponsorInfo[];
//   onHover: (m: SponsorInfo) => void;
// }> = observer((p) => {
//   return (
//     <Plot
//       style={{ width: "100%", maxWidth: "1200px", margin: "0 auto" }}
//       onClick={(e) => {
//         console.log("hover", e);
//         const element = p.data[e.points[0].pointIndex];
//         if (element) p.onHover(element);
//       }}
//       data={[
//         {
//           x: p.data.map((e) => new Date(e.meta.published * 1000)),
//           y: p.data.map((e) => e.percentSponsor / 100),

//           text: p.data.map(
//             (e) =>
//               `<b>${e.meta.title}</b><br>
//               published ${new Date(
//                 e.meta.published * 1000
//               ).toLocaleDateString()}<br>
//               Length: ${formatDuration(e.meta.lengthSeconds)}<br>
//               Sponsor duration: ${formatDuration(
//                 e.durationSponsor
//               )} (<b>${e.percentSponsor.toFixed(0)}%</b>)`
//           ),
//           hovertemplate: "%{text}",
//           type: "scatter",
//           mode: "markers",
//         },
//       ]}
//       layout={{
//         autosize: true,
//         yaxis: { tickformat: ",.0%", title: "Part that is Sponsorship" },
//         xaxis: { title: "Upload date" },
//       }}
//     />
//   );
// });

type SqliteStats = {
  filename: string;
  totalBytes: number;
  totalFetchedBytes: number;
  totalRequests: number;
};
function formatBytes(b: number) {
  if (b > 1e6) {
    return (b / 1e6).toFixed(2) + "MB";
  }
  if (b > 1e3) {
    return (b / 1e3).toFixed(2) + "KB";
  }
  return b + "B";
}

const SqliteStats: React.FC<{
  stats: SqliteStats;
  lastUpdated: number;
}> = observer(({ stats, lastUpdated }) => {
  return (
    <>
      Sqlite stats: fetched {formatBytes(stats.totalFetchedBytes)} in{" "}
      {stats.totalRequests} requests (DB size: {formatBytes(stats.totalBytes)},
      updated: {new Date(lastUpdated * 1000).toLocaleDateString()})
    </>
  );
});

// const VideoMetaDisplay: React.FC<{ video: SponsorInfo }> = observer(
//   ({ video }) => {
//     return (
//       <div>
//         <a href={`https://youtube.com/watch?v=${video.meta.videoID}`}>
//           <img
//             src={video.meta.maxresdefault_thumbnail}
//             width={200}
//             style={{ float: "left", margin: "0.5em" }}
//           ></img>
//           <h4>{video.meta.title}</h4>
//         </a>
//         {video.meta.viewCount} views
//         <br />
//         published {new Date(video.meta.published * 1000).toLocaleDateString()}
//         <br />
//         Length: {formatDuration(video.meta.lengthSeconds)}
//         <br />
//         Sponsor duration: {formatDuration(video.durationSponsor)} (
//         <b>{video.percentSponsor.toFixed(0)}%</b>)
//       </div>
//     );
//   }
// );

@observer
export class UI extends React.Component {
  worker: SqliteWorker | null = null;
  db: Database | null = null;
  @observable initState = "Loading...";
  @observable
  data:
    | { state: "noinput" }
    | { state: "loading"; tag: string }
    | { state: "loaded"; tag: string; segs: Note[] } = {
    state: "noinput",
  };
  @observable
  stats: SqliteStats | null = null;
  @observable
  dbConfig: { lastUpdated: number } | null = null;
  // @observable
  // focussedVideo: SponsorInfo | null = null;
  @observable searchInput: string = "";

  constructor(p: {}) {
    super(p);
    this.init();
    makeObservable(this);
  }
  interval: any = 0;
  componentDidMount() {
    this.interval = setInterval(async () => {
      this.stats = (await this.worker?.getStats()) || null;
    }, 1000);
  }
  componentWillUnmount() {
    clearInterval(this.interval);
  }
  async init() {
    this.initState = "connecting to sqlite httpvfs database...";
    try {
      const res = await createDbWorker();
      this.db = res.db;
      this.worker = res.worker;
      this.dbConfig = res.config;
    } catch (e) {
      console.error(e);
      this.initState = `Error connecting to database: ${e}`;
      return;
    }
    const initialTag = new URLSearchParams(location.search).get("tag");
    if (initialTag) this.setTag(initialTag);
    this.initState = "";
  }
  async setTag(search: string) {
    console.log("SETTING TAG: " + search);
    this.searchInput = search;
    // this.focussedVideo = null;
    if (this.db) {
      this.data = {
        state: "loading",
        tag: search,
      };
      this.data = {
        state: "loaded",
        tag: search,
        segs: await notesSearch(this.db, search),
      };
      console.log("data", this.data);
      {
        const searchParams = new URLSearchParams(location.search);
        searchParams.set("tag", search);
        window.history.replaceState(null, document.title, "?" + searchParams);
      }
    }
  }
  async tagsSearch(tag: string) {
    if (this.db) {
      return await tagsSearch(this.db, tag);
    }
    return [];
  }
  tagsSearchDebounce = debounce(this.tagsSearch.bind(this), 250, {
    leading: true,
  });
  // @action
  // setFocussed = (e: SponsorInfo) => (this.focussedVideo = e);

  ListOfNotes(notes:Note[]) {
    const notesList = notes.map((note) =>
      <li><a href = {note.path}>{note.path}</a></li>
    );
    return (
      <ul>{notesList}</ul>
    );
  }

  render() {
    if (this.initState) return <div>{this.initState}</div>;
    return (
      <div>
        <div>
          Search for Tag:{" "}
          <AsyncSelect<{tag : string}>
            cacheOptions
            inputValue={this.searchInput}
            onInputChange={(e) => (this.searchInput = e, console.log("searchInput changed to: ", this.searchInput))}
            loadOptions={this.tagsSearchDebounce}
            getOptionLabel={(e) => e.tag}
            getOptionValue={(e) => e.tag}
            onChange={(e) => e && this.setTag(e.tag)}
          />
        </div>
        {this.data.state === "noinput" ? (
          <></>
        ) : this.data.state === "loading" ? (
          <div>Loading notes for tag "{this.data.tag}"</div>
        ) : (
          <div>
            <p>
              Found {this.data.segs.length} notes with tag {" "}
              {this.data.tag}
            </p>{" "}
              {this.ListOfNotes(this.data.segs)}
          </div>
        )}
        {/* {this.focussedVideo && (
          <>
            Selected video: <VideoMetaDisplay video={this.focussedVideo} />
          </>
        )} */}
        <footer style={{ marginTop: "5em", color: "gray" }}>
          <div>
            {this.stats ? (
              <SqliteStats
                stats={this.stats}
                lastUpdated={this.dbConfig.lastUpdated}
              />
            ) : (
              ""
            )}{" "}
          </div>
          <div>
            Adapted from:{" "}
            <a href="https://github.com/phiresky/youtube-sponsorship-stats/">
              https://github.com/phiresky/youtube-sponsorship-stats/
            </a>
          </div>
        </footer>
      </div>
    );
  }
}
