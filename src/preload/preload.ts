import { registerApiToIpcRenderer } from "./ipc-util-renderer";
import allApis from "../main/api";

registerApiToIpcRenderer(allApis);

