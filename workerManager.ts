/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

// import URI from 'vs/base/common/uri';
// import {TPromise} from 'vs/base/common/winjs.base';
// import {IDisposable, dispose} from 'vs/base/common/lifecycle';
// import {DefaultWorkerFactory} from 'vs/base/worker/defaultWorkerFactory';
// import {SimpleWorkerClient} from 'vs/base/common/worker/simpleWorker';
// import {IModelService} from 'vs/editor/common/services/modelService';
// import {EditorModelManager} from 'vs/editor/common/services/editorWorkerServiceImpl';
import {LanguageServiceMode, LanguageServiceDefaults, TypeScriptWorkerProtocol} from './typescript';

import TPromise = Monaco.TPromise;

class WorkerManager {

	// private _modelService: IModelService;
	private _defaults: LanguageServiceDefaults;
	private _worker: Monaco.IMonacoWebWorker<TypeScriptWorkerProtocol>;
	private _client: TPromise<TypeScriptWorkerProtocol>;
	// private _client: TPromise<{ worker: TypeScriptWorkerProtocol; manager: EditorModelManager }> = null;
	// private _clientDispose: IDisposable[] = [];
	// private _factory = new DefaultWorkerFactory();

	constructor(defaults: LanguageServiceDefaults) {
		// this._modelService = modelService;
		this._defaults = defaults;
		this._worker = null;
	}

	private _createClient(): TPromise<TypeScriptWorkerProtocol> {
		// TODO: stop when idle
		
		this._worker = Monaco.createWebWorker<TypeScriptWorkerProtocol>({
			moduleId: 'vs/language/monaco-typescript/out/worker',//require.toUrl()
		});

		let configChangeListener: Monaco.Editor.IDisposable = null;

		const stopWorker = () => {
			configChangeListener.dispose();
			this._worker.dispose();
			this._worker = null;
			this._client = null;
		};

		configChangeListener = this._defaults.onDidChange(stopWorker);

		let _client:TypeScriptWorkerProtocol = null;
		return this._worker.getProxy().then((client) => {
			_client = client;
		}).then(_ => {
			const {compilerOptions, extraLibs} = this._defaults;
			return _client.acceptDefaults(compilerOptions, extraLibs);
		}).then(_ => _client);

		// // let worker

		// const client = new SimpleWorkerClient<TypeScriptWorkerProtocol>(this._factory, 'vs/languages/typescript/common/worker', TypeScriptWorkerProtocol);
		// const manager = new EditorModelManager(client.get(), this._modelService, true);

		// this._clientDispose.push(manager);
		// this._clientDispose.push(client);

		// const stopWorker = () => {
		// 	this._clientDispose = dispose(this._clientDispose);
		// 	this._client = null;
		// };

		// // stop worker after being idle
		// const handle = setInterval(() => {
		// 	if (Date.now() - client.getLastRequestTimestamp() > 1000 * 60) {
		// 		stopWorker();
		// 	}
		// }, 1000 * 60);
		// this._clientDispose.push({ dispose() { clearInterval(handle); } });

		// // stop worker when defaults change
		// this._clientDispose.push(this._defaults.onDidChange(() => stopWorker()));

		// // send default to worker right away
		// const worker = client.get();
		// const {compilerOptions, extraLibs} = this._defaults;
		// return worker.acceptDefaults(compilerOptions, extraLibs).then(() => ({ worker, manager }));
	}

	// dispose(): void {
	// 	this._clientDispose = dispose(this._clientDispose);
	// 	this._client = null;
	// }

	getLanguageServiceWorker(...resources: Monaco.Uri[]): TPromise<TypeScriptWorkerProtocol> {
		if (!this._client) {
			this._client = this._createClient();
		}

		return this._client.then((data) => {
			return this._worker.withSyncedResources(resources).then(_ => data)
		});
	}
}

export function create(defaults: LanguageServiceDefaults): LanguageServiceMode {
	return new WorkerManager(defaults);
}