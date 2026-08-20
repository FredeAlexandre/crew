/**
 * 5 — play out a mission and snapshot the state
 *
 *   nub ./5-full-mission/index.ts
 *   nub ./5-full-mission/index.ts 8
 *
 * First-legal is a dummy partner, not strategy. The Room DO would persist `JSON.stringify(state)`.
 */
import { heading, note, showTable } from "../show.ts";
import { seedFromArgv, startAttempt, toPlay } from "../steps.ts";
import { playOut } from "./play.ts";

const seed = seedFromArgv(8);
const started = startAttempt(seed);
const ended = playOut(toPlay(started.state));

heading(`mission over  seed=${seed}`);
showTable(ended);

const snapshot = JSON.stringify(ended);
const restored: unknown = JSON.parse(snapshot);
heading("Durable Object snapshot");
note(`${snapshot.length} bytes of JSON`);
note(`round-trip equal: ${JSON.stringify(restored) === snapshot}`);
note("reconnect = send the latest view-model, not a replay of every fact.");
