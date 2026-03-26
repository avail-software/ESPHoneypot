import "./style.css";
import { Store } from "./state/store";
import { INITIAL_STATE } from "./types";
import { FlashService } from "./services/flash-service";
import { App } from "./components/app";

const root = document.querySelector<HTMLDivElement>("#app");
if (!root) throw new Error("Could not find #app");

const store = new Store(INITIAL_STATE);
const flashService = new FlashService(store);
const app = new App(root, store, flashService);

app.start();
