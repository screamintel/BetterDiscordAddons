
module.exports = (Plugin, Api) => {
    const {WebpackModules, DiscordModules, Patcher, ReactComponents, Utilities} = Api;

    return class AutoPlayGifs extends Plugin {
        constructor() {
            super();
            this.cancelChatAvatars = () => {};
            this.cancelMemberListAvatars = () => {};
            this.cancelGuildList = () => {};
        }

        onStart() {
            this.promises = {state: {cancelled: false}, cancel() {this.state.cancelled = true;}};
            if (this.settings.chat) this.patchChatAvatars();
            if (this.settings.memberList) this.patchMemberListAvatars();
            if (this.settings.guildList) this.patchGuildList(this.promises.state);
        }
        
        onStop() {
            this.cancelChatAvatars();
            this.cancelMemberListAvatars();
            this.cancelGuildList();
        }

        getSettingsPanel() {
            const panel = this.buildSettingsPanel();
            panel.addListener((id, value) => {
                if (id == "chat") {
                    if (value) this.patchChatAvatars();
                    else this.cancelChatAvatars();
                }
                if (id == "memberList") {
                    if (value) this.patchMemberListAvatars();
                    else this.cancelMemberListAvatars();
                }
                if (id == "guildList") {
                    if (value) this.patchGuildList();
                    else this.cancelGuildList();
                }
            });
            return panel.getElement();
        }

        async patchGuildList(promiseState) {
            const Guild = await ReactComponents.getComponentByName("Guild", ".listItem-2P_4kh");
            if (promiseState.cancelled) return;
            this.cancelGuildList = Patcher.after(Guild.component.prototype, "render", (thisObject, args, returnValue) => {
                if (!thisObject.props.animatable) return;
                const iconComponent = Utilities.findInReactTree(returnValue, p => p.icon);
                if (!iconComponent) return;
                iconComponent.icon = thisObject.props.guild.getIconURL("gif");
            });
            Guild.forceUpdateAll();
        }

        patchChatAvatars() {
            const MessageGroup = WebpackModules.find(m => m.defaultProps && m.defaultProps.disableManageMessages);
            this.cancelChatAvatars = Patcher.before(MessageGroup.prototype, "render", (thisObject) => {
                thisObject.state.disableAvatarAnimation = false;
            });
        }
    
        patchMemberListAvatars() {
            const MemberList = WebpackModules.findByDisplayName("MemberListItem");
            this.cancelMemberListAvatars = Patcher.before(MemberList.prototype, "render", (thisObject) => {
                if (!thisObject.props.user) return;
                const id = thisObject.props.user.id;
                const hasAnimatedAvatar = DiscordModules.ImageResolver.hasAnimatedAvatar(DiscordModules.UserStore.getUser(id));
                if (!hasAnimatedAvatar) return;
                thisObject.props.user.getAvatarURL = () => {return DiscordModules.ImageResolver.getUserAvatarURL(DiscordModules.UserStore.getUser(id)).replace("webp", "gif");};
            });
        }

    };
};