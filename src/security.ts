/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';

import { GIFTPreviewManager } from './features/previewManager';

import * as nls from 'vscode-nls';

const localize = nls.loadMessageBundle();

export enum GIFTPreviewSecurityLevel {
	Strict = 0,
	AllowInsecureContent = 1,
	AllowScriptsAndAllContent = 2,
	AllowInsecureLocalContent = 3
}

export interface ContentSecurityPolicyArbiter {
	getSecurityLevelForResource(resource: vscode.Uri): GIFTPreviewSecurityLevel;

	setSecurityLevelForResource(resource: vscode.Uri, level: GIFTPreviewSecurityLevel): Thenable<void>;

	shouldAllowSvgsForResource(resource: vscode.Uri): void;

	shouldDisableSecurityWarnings(): boolean;

	setShouldDisableSecurityWarning(shouldShow: boolean): Thenable<void>;
}

export class ExtensionContentSecurityPolicyArbiter implements ContentSecurityPolicyArbiter {
	private readonly old_trusted_workspace_key = 'trusted_preview_workspace:';
	private readonly security_level_key = 'preview_security_level:';
	private readonly should_disable_security_warning_key = 'preview_should_show_security_warning:';

	constructor(
		private readonly globalState: vscode.Memento,
		private readonly workspaceState: vscode.Memento
	) { }

	public getSecurityLevelForResource(resource: vscode.Uri): GIFTPreviewSecurityLevel {
		// Use new security level setting first
		const level = this.globalState.get<GIFTPreviewSecurityLevel | undefined>(this.security_level_key + this.getRoot(resource), undefined);
		if (typeof level !== 'undefined') {
			return level;
		}

		// Fallback to old trusted workspace setting
		if (this.globalState.get<boolean>(this.old_trusted_workspace_key + this.getRoot(resource), false)) {
			return GIFTPreviewSecurityLevel.AllowScriptsAndAllContent;
		}
		return GIFTPreviewSecurityLevel.Strict;
	}

	public setSecurityLevelForResource(resource: vscode.Uri, level: GIFTPreviewSecurityLevel): Thenable<void> {
		return this.globalState.update(this.security_level_key + this.getRoot(resource), level);
	}

	public shouldAllowSvgsForResource(resource: vscode.Uri) {
		const securityLevel = this.getSecurityLevelForResource(resource);
		return securityLevel === GIFTPreviewSecurityLevel.AllowInsecureContent || securityLevel === GIFTPreviewSecurityLevel.AllowScriptsAndAllContent;
	}

	public shouldDisableSecurityWarnings(): boolean {
		return this.workspaceState.get<boolean>(this.should_disable_security_warning_key, false);
	}

	public setShouldDisableSecurityWarning(disabled: boolean): Thenable<void> {
		return this.workspaceState.update(this.should_disable_security_warning_key, disabled);
	}

	private getRoot(resource: vscode.Uri): vscode.Uri {
		if (vscode.workspace.workspaceFolders) {
			const folderForResource = vscode.workspace.getWorkspaceFolder(resource);
			if (folderForResource) {
				return folderForResource.uri;
			}

			if (vscode.workspace.workspaceFolders.length) {
				return vscode.workspace.workspaceFolders[0].uri;
			}
		}

		return resource;
	}
}

export class PreviewSecuritySelector {

	public constructor(
		private readonly cspArbiter: ContentSecurityPolicyArbiter,
		private readonly webviewManager: GIFTPreviewManager
	) { }

	public async showSecuritySelectorForResource(resource: vscode.Uri): Promise<void> {
		interface PreviewSecurityPickItem extends vscode.QuickPickItem {
			readonly type: 'moreinfo' | 'toggle' | GIFTPreviewSecurityLevel;
		}

		function markActiveWhen(when: boolean): string {
			return when ? '• ' : '';
		}

		const currentSecurityLevel = this.cspArbiter.getSecurityLevelForResource(resource);
		const selection = await vscode.window.showQuickPick<PreviewSecurityPickItem>(
			[
				{
					type: GIFTPreviewSecurityLevel.Strict,
					label: markActiveWhen(currentSecurityLevel === GIFTPreviewSecurityLevel.Strict) + localize('strict.title', 'Strict'),
					description: localize('strict.description', 'Only load secure content'),
				}, {
					type: GIFTPreviewSecurityLevel.AllowInsecureLocalContent,
					label: markActiveWhen(currentSecurityLevel === GIFTPreviewSecurityLevel.AllowInsecureLocalContent) + localize('insecureLocalContent.title', 'Allow insecure local content'),
					description: localize('insecureLocalContent.description', 'Enable loading content over http served from localhost'),
				}, {
					type: GIFTPreviewSecurityLevel.AllowInsecureContent,
					label: markActiveWhen(currentSecurityLevel === GIFTPreviewSecurityLevel.AllowInsecureContent) + localize('insecureContent.title', 'Allow insecure content'),
					description: localize('insecureContent.description', 'Enable loading content over http'),
				}, {
					type: GIFTPreviewSecurityLevel.AllowScriptsAndAllContent,
					label: markActiveWhen(currentSecurityLevel === GIFTPreviewSecurityLevel.AllowScriptsAndAllContent) + localize('disable.title', 'Disable'),
					description: localize('disable.description', 'Allow all content and script execution. Not recommended'),
				}, {
					type: 'moreinfo',
					label: localize('moreInfo.title', 'More Information'),
					description: ''
				}, {
					type: 'toggle',
					label: this.cspArbiter.shouldDisableSecurityWarnings()
						? localize('enableSecurityWarning.title', "Enable preview security warnings in this workspace")
						: localize('disableSecurityWarning.title', "Disable preview security warning in this workspace"),
					description: localize('toggleSecurityWarning.description', 'Does not affect the content security level')
				},
			], {
				placeHolder: localize(
					'preview.showPreviewSecuritySelector.title',
					'Select security settings for GIFT previews in this workspace'),
			});
		if (!selection) {
			return;
		}

		if (selection.type === 'moreinfo') {
			vscode.commands.executeCommand('vscode.open', vscode.Uri.parse('https://go.microsoft.com/fwlink/?linkid=854414'));
			return;
		}

		if (selection.type === 'toggle') {
			this.cspArbiter.setShouldDisableSecurityWarning(!this.cspArbiter.shouldDisableSecurityWarnings());
			return;
		} else {
			await this.cspArbiter.setSecurityLevelForResource(resource, selection.type);
		}
		this.webviewManager.refresh();
	}
}
