import { registerApiToIpcRenderer } from "./create-preload-binds";
import { allApis } from "../main/api";

registerApiToIpcRenderer("api", allApis);

