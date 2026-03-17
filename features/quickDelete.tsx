/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import {
    findGroupChildrenByChildId,
} from "@api/ContextMenu";
import { Logger } from "@utils/Logger";
import { sleep } from "@utils/misc";
import { findByPropsLazy } from "@webpack";
import { Alerts, Constants, Menu, RestAPI, showToast, Toasts, UserStore } from "@webpack/common";

const logger = new Logger("Toolkit/QuickDelete");

const MessageActions = findByPropsLazy("deleteMessage", "startEditMessage");

let activePurge: { cancelled: boolean; } | null = null;

export function cancelActivePurge() {
    if (activePurge) activePurge.cancelled = true;
}

const escHandler = (e: KeyboardEvent) => {
    if (e.key === "Escape") cancelActivePurge();
};

async function fetchMyMessages(
    channelId: string,
    startMessage: { id: string; author: { id: string; }; },
    direction: "before" | "after" | "around",
    maxCount: number
): Promise<any[]> {
    const currentUserId = UserStore.getCurrentUser().id;
    const isOwn = startMessage.author.id === currentUserId;

    if (direction === "around") {
        const [above, below] = await Promise.all([
            RestAPI.get({
                url: Constants.Endpoints.MESSAGES(channelId),
                query: { limit: 100, before: startMessage.id },
            }),
            RestAPI.get({
                url: Constants.Endpoints.MESSAGES(channelId),
                query: { limit: 100, after: startMessage.id },
            }),
        ]);

        const all = [...above.body, ...below.body]
            .filter((m: any) => m.author.id === currentUserId && m.id !== startMessage.id);
        if (isOwn) all.unshift(startMessage);
        return all.slice(0, maxCount);
    }

    const { body } = await RestAPI.get({
        url: Constants.Endpoints.MESSAGES(channelId),
        query: { limit: 100, [direction]: startMessage.id },
    });

    const msgs = body.filter((m: any) => m.author.id === currentUserId);
    if (isOwn) direction === "before" ? msgs.unshift(startMessage) : msgs.push(startMessage);
    return msgs.slice(0, maxCount);
}

async function deleteMessages(channelId: string, messages: any[]) {
    if (activePurge) {
        showToast("Purge already in progress", Toasts.Type.FAILURE);
        return;
    }

    activePurge = { cancelled: false };
    document.addEventListener("keydown", escHandler);

    try {
        const total = messages.length;
        let deleted = 0;
        let delay = 200;

        showToast("Purging... press ESC to cancel", Toasts.Type.MESSAGE);

        for (const msg of messages) {
            if (activePurge.cancelled) {
                showToast("Purge cancelled", Toasts.Type.FAILURE);
                break;
            }

            try {
                await MessageActions.deleteMessage(channelId, msg.id);
                deleted++;
                delay = Math.max(200, delay - 50);
            } catch (err: any) {
                if (err?.status === 404) {
                    deleted++;
                } else if (err?.status === 429) {
                    const retryAfter = (err?.body?.retry_after ?? 1) * 1000;
                    delay = retryAfter + 200;
                    await sleep(retryAfter);
                    try {
                        await MessageActions.deleteMessage(channelId, msg.id);
                        deleted++;
                    } catch {
                        logger.error("Retry failed for message", msg.id);
                    }
                } else {
                    logger.error("Failed to delete message", msg.id, err);
                }
            }

            if (deleted < total) {
                await sleep(delay);
            }
        }

        if (!activePurge.cancelled) {
            showToast(`Deleted ${deleted} messages`, Toasts.Type.SUCCESS);
        }
    } catch (err) {
        logger.error("Purge failed", err);
        showToast("Purge failed — check console", Toasts.Type.FAILURE);
    } finally {
        document.removeEventListener("keydown", escHandler);
        activePurge = null;
    }
}

async function confirmAndPurge(
    channelId: string,
    message: { id: string; author: { id: string; }; },
    direction: "before" | "after" | "around",
    maxCount: number
) {
    const dirLabel = direction === "before" ? "this & above" : direction === "after" ? "this & below" : "around";

    showToast("Scanning messages...", Toasts.Type.MESSAGE);

    let messages: any[];
    try {
        messages = await fetchMyMessages(channelId, message, direction, maxCount);
    } catch (err) {
        logger.error("Failed to fetch messages", err);
        showToast("Failed to fetch messages", Toasts.Type.FAILURE);
        return;
    }

    if (messages.length === 0) {
        showToast("No messages found to delete", Toasts.Type.MESSAGE);
        return;
    }

    Alerts.show({
        title: "Purge Messages",
        body: `Found ${messages.length} of your messages ${dirLabel}. Delete them?`,
        confirmText: "Delete",
        cancelText: "Cancel",
        onConfirm: () => deleteMessages(channelId, messages),
    });
}

export const messageContextMenuPatch = (children: any, props: any, maxCount: number) => {
    if (!props?.message) return;

    const message = props.message;
    const channelId = message.channel_id;

    const group = findGroupChildrenByChildId("delete", children) ?? children;

    if (activePurge) {
        group.push(
            <Menu.MenuItem
                id="quick-delete-cancel"
                key="quick-delete-cancel"
                label="Cancel Purge"
                color="danger"
                action={cancelActivePurge}
            />
        );
    } else {
        group.push(
            <Menu.MenuItem
                id="quick-delete"
                key="quick-delete"
                label="Purge My Messages"
            >
                <Menu.MenuItem
                    id="quick-delete-above"
                    key="quick-delete-above"
                    label="This & Above"
                    action={() => confirmAndPurge(channelId, message, "before", maxCount)}
                />
                <Menu.MenuItem
                    id="quick-delete-below"
                    key="quick-delete-below"
                    label="This & Below"
                    action={() => confirmAndPurge(channelId, message, "after", maxCount)}
                />
                <Menu.MenuItem
                    id="quick-delete-all"
                    key="quick-delete-all"
                    label="All Around"
                    action={() => confirmAndPurge(channelId, message, "around", maxCount)}
                />
            </Menu.MenuItem>
        );
    }
};
