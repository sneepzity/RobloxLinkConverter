/**
 * @name RobloxLinkConverter
 * @author beezity and Claude 3.7
 * @description Converts Roblox private server links to a consistent format
 * @version 0.0.1
 * @website https://github.com/sleepzity/RobloxLinkConverter
 * @source https://github.com/sleepzity/RobloxLinkConverter
 */

class RobloxLinkConverter {
    constructor() {
        this.initialized = false;
    }

    getName() { return "RobloxLinkConverter"; }
    getDescription() { return "Converts Roblox private server links to a consistent format"; }
    getVersion() { return "0.0.1"; }
    getAuthor() { return "beezity and Claude 3.7"; }

    start() {
        if (this.initialized) return;
        this.initialized = true;
        this.patchMessageContent();
        console.log("RobloxLinkConverter started!");
    }

    stop() {
        if (!this.initialized) return;
        this.initialized = false;
        BdApi.Patcher.unpatchAll("RobloxLinkConverter");
        console.log("RobloxLinkConverter stopped!");
    }

    /**
     * Converts a Roblox share link to the privateServerLinkCode format
     * @param {string} url - The URL to convert
     * @returns {string} - The converted URL
     */
    convertRobloxLink(url) {
        try {
            // If it's already in the privateServerLinkCode format, return it
            if (url.includes('privateServerLinkCode=')) {
                return url;
            }
            
            let code = null;
            let gameId = "1614683211"; // Default game ID from example
            
            // Case 1: Regular share links
            const shareCodeMatch = url.match(/[?&]code=([^&]+)/i);
            if (shareCodeMatch) {
                code = shareCodeMatch[1];
            }
            
            // Case 2: Shortened/encoded links
            if (url.includes('ro.blox.com') || url.includes('roblox.com')) {
                // Look for code in URL-encoded format or normal format
                const linkCodeMatch = url.match(/(%3F|[?&])code(%3D|=)([^%&]+)/i);
                if (linkCodeMatch) {
                    try {
                        code = decodeURIComponent(linkCodeMatch[3]);
                    } catch (e) {
                        code = linkCodeMatch[3];
                    }
                }
            }
            
            // Try to extract game ID if possible
            const gameIdMatch = url.match(/\/games\/(\d+)\//);
            if (gameIdMatch && gameIdMatch[1]) {
                gameId = gameIdMatch[1];
            }
            
            // If we have a code, create the new URL
            if (code) {
                return `https://www.roblox.com/games/${gameId}/UPDATE-5-0-Anime-Vanguards?privateServerLinkCode=${code}`;
            }
            
            return url;
        } catch (error) {
            console.error('Error converting Roblox link:', error);
            return url;
        }
    }
    
    /**
     * Patches Discord message content to convert Roblox links
     */
    patchMessageContent() {
        try {
            // Find the message component using BdApi
            const MessageContent = BdApi.findModuleByProps('type', 'default')?.default;
            
            if (!MessageContent) {
                console.error("Could not find MessageContent component");
                return;
            }
            
            // Patch the message renderer
            BdApi.Patcher.after("RobloxLinkConverter", MessageContent, "type", (_, [props], ret) => {
                if (!props || !props.message || !props.message.content) return ret;
                
                // Look for Roblox links
                const robloxLinkRegex = /(https?:\/\/(?:www\.|ro\.)?(?:roblox\.com|rbxcdn\.com)\/[^\s'"]+)/gi;
                let newContent = props.message.content;
                let match;
                
                // Find and replace all Roblox links
                while ((match = robloxLinkRegex.exec(props.message.content)) !== null) {
                    const originalLink = match[0];
                    const convertedLink = this.convertRobloxLink(originalLink);
                    
                    if (convertedLink !== originalLink) {
                        newContent = newContent.replace(originalLink, convertedLink);
                    }
                }
                
                // If we modified the content, update it
                if (newContent !== props.message.content) {
                    props.message.content = newContent;
                }
                
                return ret;
            });
            
            // Add alternative patching methods in case the above doesn't work
            this.patchLinkRenderer();
            
        } catch (error) {
            console.error("Error setting up RobloxLinkConverter:", error);
        }
    }
    
    // Additional patching method for hyperlinks
    patchLinkRenderer() {
        try {
            // Try to find anchor component
            const Anchor = BdApi.findModule(m => m.default && m.default.displayName === 'Anchor');
            if (Anchor) {
                BdApi.Patcher.before("RobloxLinkConverter", Anchor, "default", (_, [props]) => {
                    if (props.href && (props.href.includes('roblox.com') || props.href.includes('ro.blox.com'))) {
                        props.href = this.convertRobloxLink(props.href);
                    }
                });
            }
            
            // Also try to patch the hyperlink component
            const Hyperlink = BdApi.findModule(m => m.default && m.default.displayName === 'Hyperlink');
            if (Hyperlink) {
                BdApi.Patcher.before("RobloxLinkConverter", Hyperlink, "default", (_, [props]) => {
                    if (props.href && (props.href.includes('roblox.com') || props.href.includes('ro.blox.com'))) {
                        props.href = this.convertRobloxLink(props.href);
                    }
                });
            }
            
        } catch (error) {
            console.error("Error patching link renderer:", error);
        }
    }
    
    observer(changes) {
        // Watch for added DOM nodes that might contain links
        const addedNodes = changes.addedNodes;
        const removedNodes = changes.removedNodes;
        
        if (addedNodes && addedNodes.length) {
            for (const node of addedNodes) {
                if (node.nodeType === 1 && node.classList && (
                    node.classList.contains("messageContent") || 
                    node.classList.contains("content") ||
                    node.classList.contains("markup")
                )) {
                    this.processNode(node);
                }
            }
        }
    }
    
    // Process DOM nodes for Roblox links
    processNode(node) {
        const anchors = node.querySelectorAll('a[href*="roblox.com"], a[href*="ro.blox.com"]');
        anchors.forEach(anchor => {
            const originalHref = anchor.href;
            const convertedHref = this.convertRobloxLink(originalHref);
            if (convertedHref !== originalHref) {
                anchor.href = convertedHref;
                // Also update text content if it's the same as the href
                if (anchor.textContent === originalHref) {
                    anchor.textContent = convertedHref;
                }
            }
        });
    }
}

module.exports = RobloxLinkConverter;
