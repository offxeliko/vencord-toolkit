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

import { addMessagePopoverButton, removeMessagePopoverButton } from "@api/MessagePopover";
import { definePluginSettings } from "@api/Settings";
import { ImageIcon } from "@components/Icons";
import definePlugin, { OptionType } from "@utils/types";

import {
    imageContextMenuPatch,
    messageContextMenuPatch,
    renderPopoverButton,
} from "./features/mediaFavorites";
import { cancelActivePurge, messageContextMenuPatch as quickDeleteContextMenuPatch } from "./features/quickDelete";

const settings = definePluginSettings({
    mediaFavorites: {
        type: OptionType.BOOLEAN,
        description:
            "Save images to favorites by right clicking any media in chat",
        default: true,
        restartNeeded: true,
    },
    quickDelete: {
        type: OptionType.BOOLEAN,
        description: "Bulk delete your own messages via right-click context menu",
        default: true,
        restartNeeded: true,
    },
    quickDeleteLimit: {
        type: OptionType.SLIDER,
        description: "Max number of messages to delete per purge",
        default: 25,
        markers: [5, 10, 15, 20, 25, 50, 75, 100],
        stickToMarkers: false,
    },
});

export default definePlugin({
    name: "Toolkit",
    description: "Collection of small quality-of-life tweaks",
    authors: [
        {
            name: "Xeliko",
            id: 986611028471210005n,
        },
    ],
    settings,

    start() {
        addMessagePopoverButton("media-fav-toggle", msg => {
            if (!settings.store.mediaFavorites) return null;
            return renderPopoverButton(msg);
        }, ImageIcon);
    },

    stop() {
        removeMessagePopoverButton("media-fav-toggle");
        cancelActivePurge();
    },

    contextMenus: {
        message: (children, props) => {
            if (settings.store.mediaFavorites)
                messageContextMenuPatch(children, props);
            if (settings.store.quickDelete)
                quickDeleteContextMenuPatch(children, props, settings.store.quickDeleteLimit);
        },
        "image-context": (children, props) => {
            if (settings.store.mediaFavorites)
                imageContextMenuPatch(children, props);
        },
    },
});
