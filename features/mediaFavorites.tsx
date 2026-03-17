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
    NavContextMenuPatchCallback,
} from "@api/ContextMenu";
import { MessagePopoverButtonItem } from "@api/MessagePopover";
import { ImageIcon } from "@components/Icons";
import { Logger } from "@utils/Logger";
import { findByCodeLazy, findByPropsLazy } from "@webpack";
import { ChannelStore, Menu } from "@webpack/common";
import { Message } from "@vencord/discord-types";

const logger = new Logger("Toolkit/MediaFavorites");

const addFavoriteGif = findByCodeLazy("favoriteGifs", "GIF_FAVORITED");
const removeFavoriteGif = findByCodeLazy("favoriteGifs", "GIF_UNFAVORITED");
const FrecencySettings = findByPropsLazy("ProtoClass", "getCurrentValue");

interface FavoriteGif {
    url: string;
    src: string;
    width: number;
    height: number;
    format: number;
    order?: number;
}

interface ImageAttachment {
    url: string;
    proxy_url?: string;
    content_type?: string;
    width?: number;
    height?: number;
}

const ALLOWED_HOSTS = new Set([
    "tenor.com",
    "media.tenor.com",
    "c.tenor.com",
    "giphy.com",
    "media.giphy.com",
    "i.giphy.com",
    "media.discordapp.net",
    "media.discordapp.com",
    "cdn.discordapp.com",
]);

function isAllowedMediaHost(url: string): boolean {
    try {
        const { hostname, protocol } = new URL(url);
        if (protocol !== "https:") return false;
        if (ALLOWED_HOSTS.has(hostname)) return true;
        for (const allowed of ALLOWED_HOSTS) {
            if (hostname.endsWith("." + allowed)) return true;
        }
        return false;
    } catch {
        return false;
    }
}

function isValidMediaUrl(url: string): boolean {
    try {
        return new URL(url).protocol === "https:";
    } catch {
        return false;
    }
}

function getFavs(): Record<string, FavoriteGif> {
    try {
        return FrecencySettings.getCurrentValue()?.favoriteGifs?.gifs ?? {};
    } catch (err) {
        logger.warn("Could not read favorite GIFs:", err);
        return {};
    }
}

function findFavEntry(url: string): { isFav: boolean; key: string | null } {
    const favs = getFavs();
    if (Object.hasOwn(favs, url)) return { isFav: true, key: url };

    const base = url.split("?")[0];
    for (const key of Object.keys(favs)) {
        if (key.split("?")[0] === base) return { isFav: true, key };
    }

    return { isFav: false, key: null };
}

function isFav(url: string): boolean {
    return findFavEntry(url).isFav;
}

function addFav(url: string, src?: string, width?: number, height?: number) {
    try {
        if (!isValidMediaUrl(url)) {
            logger.warn("Refusing to favorite non-https URL:", url);
            return;
        }
        addFavoriteGif({
            url,
            src: src ?? url,
            width: width ?? 320,
            height: height ?? 240,
            format: 1,
        });
    } catch (err) {
        logger.error("Failed to add favorite:", err);
    }
}

function removeFav(url: string) {
    try {
        const { key } = findFavEntry(url);
        if (key) {
            removeFavoriteGif(key);
        }
    } catch (err) {
        logger.error("Failed to remove favorite:", err);
    }
}

function toggleFav(url: string, src?: string, width?: number, height?: number) {
    const { key } = findFavEntry(url);
    if (key) {
        removeFav(url);
    } else {
        addFav(url, src, width, height);
    }
}

const IMAGE_EXT_RE = /\.(png|jpe?g|gif|gifv|webp|avif|bmp)(\?|$)/i;

export function getImageAttachments(message: { attachments?: ImageAttachment[] }): ImageAttachment[] {
    const attachments = message?.attachments ?? [];
    return attachments.filter(
        a =>
            a.url &&
            typeof a.url === "string" &&
            (a.content_type?.startsWith("image/") || IMAGE_EXT_RE.test(a.url)),
    );
}

function getImageFromProps(
    props: any,
): { url: string; width: number; height: number } | null {
    const src = props?.itemSrc ?? props?.itemHref;
    if (!src || typeof src !== "string") return null;
    if (!IMAGE_EXT_RE.test(src) && !isAllowedMediaHost(src)) return null;
    return { url: src, width: 0, height: 0 };
}

export const messageContextMenuPatch: NavContextMenuPatchCallback = (
    children,
    props,
) => {
    const media = getImageFromProps(props);
    if (!media) return;

    const { url } = media;
    const favorited = isFav(url);

    const group = findGroupChildrenByChildId("copy-link", children) ?? children;
    group.push(
        <Menu.MenuItem
            id="media-fav-toggle"
            key="media-fav-toggle"
            label={favorited ? "Remove from Favorites" : "Add to Favorites"}
            action={() => toggleFav(url)}
        />,
    );
};

export const imageContextMenuPatch: NavContextMenuPatchCallback = (
    children,
    props,
) => {
    if (!props?.src || typeof props.src !== "string") return;

    const url: string = props.src;
    const favorited = isFav(url);

    const group =
        findGroupChildrenByChildId("copy-native-link", children) ?? children;
    group.push(
        <Menu.MenuItem
            id="media-fav-toggle"
            key="media-fav-toggle"
            label={favorited ? "Remove from Favorites" : "Add to Favorites"}
            action={() => toggleFav(url)}
        />,
    );
};

export function renderPopoverButton(msg: Message): MessagePopoverButtonItem | null {
    const images = getImageAttachments(msg);
    if (images.length === 0) return null;

    const allFavorited = images.every(a => isFav(a.url));
    const channel = ChannelStore.getChannel(msg.channel_id);
    if (!channel) return null;

    return {
        label: allFavorited ? "Remove from Favorites" : "Add to Favorites",
        icon: ImageIcon,
        message: msg,
        channel,
        onClick: () => {
            const shouldRemove = allFavorited;
            for (const a of images) {
                if (shouldRemove) {
                    removeFav(a.url);
                } else if (!isFav(a.url)) {
                    addFav(
                        a.url,
                        a.proxy_url ?? a.url,
                        a.width ?? 0,
                        a.height ?? 0,
                    );
                }
            }
        },
    };
}
