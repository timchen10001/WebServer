import { __prod__ } from "../constants";
import dev from "./dev";
import prod from "./prod";

export default __prod__ ? prod : dev;