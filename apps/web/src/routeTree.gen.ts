/* eslint-disable */

import { Route as rootRouteImport } from "./routes/__root";
import { Route as IndexRouteImport } from "./routes/index";
import { Route as LobbyRouteImport } from "./routes/lobby";
import { Route as PlaygroundRouteImport } from "./routes/playground";

const IndexRoute = IndexRouteImport.update({
	id: "/",
	path: "/",
	getParentRoute: () => rootRouteImport,
} as never);

const LobbyRoute = LobbyRouteImport.update({
	id: "/lobby",
	path: "/lobby",
	getParentRoute: () => rootRouteImport,
} as never);

const PlaygroundRoute = PlaygroundRouteImport.update({
	id: "/playground",
	path: "/playground",
	getParentRoute: () => rootRouteImport,
} as never);

export interface FileRoutesByFullPath {
	"/": typeof IndexRoute;
	"/lobby": typeof LobbyRoute;
	"/playground": typeof PlaygroundRoute;
}

export interface FileRoutesByTo {
	"/": typeof IndexRoute;
	"/lobby": typeof LobbyRoute;
	"/playground": typeof PlaygroundRoute;
}

export interface FileRoutesById {
	__root__: typeof rootRouteImport;
	"/": typeof IndexRoute;
	"/lobby": typeof LobbyRoute;
	"/playground": typeof PlaygroundRoute;
}

export interface FileRouteTypes {
	fileRoutesByFullPath: FileRoutesByFullPath;
	fullPaths: "/" | "/lobby" | "/playground";
	fileRoutesByTo: FileRoutesByTo;
	to: "/" | "/lobby" | "/playground";
	id: "__root__" | "/" | "/lobby" | "/playground";
	fileRoutesById: FileRoutesById;
}

export interface RootRouteChildren {
	IndexRoute: typeof IndexRoute;
	LobbyRoute: typeof LobbyRoute;
	PlaygroundRoute: typeof PlaygroundRoute;
}

declare module "@tanstack/react-router" {
	interface FileRoutesByPath {
		"/": {
			id: "/";
			path: "/";
			fullPath: "/";
			preLoaderRoute: typeof IndexRouteImport;
			parentRoute: typeof rootRouteImport;
		};
		"/lobby": {
			id: "/lobby";
			path: "/lobby";
			fullPath: "/lobby";
			preLoaderRoute: typeof LobbyRouteImport;
			parentRoute: typeof rootRouteImport;
		};
		"/playground": {
			id: "/playground";
			path: "/playground";
			fullPath: "/playground";
			preLoaderRoute: typeof PlaygroundRouteImport;
			parentRoute: typeof rootRouteImport;
		};
	}
}

const rootRouteChildren: RootRouteChildren = {
	IndexRoute,
	LobbyRoute,
	PlaygroundRoute,
};

export const routeTree = rootRouteImport
	._addFileChildren(rootRouteChildren)
	._addFileTypes<FileRouteTypes>();
