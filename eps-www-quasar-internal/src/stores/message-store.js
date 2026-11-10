import { defineStore } from 'pinia';
import { api } from 'src/boot/axios';

// Everything the header's Messages menu and the Messages page need — the same shape as the revapp
// apps' message store:
//   roster         the people you can message (the Team directory), each with their unread count
//   conversations  the people you have talked to: the last message, who sent it, when
//   thread         the open conversation, oldest first
// Not persisted: it is reloaded on every sign-in.
export const useMessageStore = defineStore('messageStore', {
    state: () => ({
        roster: [],
        conversations: [],
        activeUserId: null,
        thread: [],
        loading: false,
        loadingThread: false,
        sending: false,
    }),

    getters: {
        unreadTotal: (state) => state.roster.reduce((sum, m) => sum + (m.unreadCount || 0), 0),
    },

    actions: {
        async loadDirectory() {
            this.loading = true;
            try {
                const { data } = await api.get('/team/directory');
                this.roster = data.data || [];
            } catch (error) {
                console.error('Error loading the team directory:', error);
            } finally {
                this.loading = false;
            }
        },

        async loadConversations() {
            try {
                const { data } = await api.get('/messages');
                this.conversations = data.data || [];
            } catch (error) {
                console.error('Error loading conversations:', error);
            }
        },

        // Opens a person's thread (the server marks their messages to you read as it answers).
        async openThread(userId) {
            this.activeUserId = userId;
            this.loadingThread = true;
            try {
                const { data } = await api.get(`/messages/${userId}`);
                // the person may have been switched while this was loading
                if (this.activeUserId === userId) this.thread = data.data || [];
                this.clear(userId);
            } catch (error) {
                console.error('Error loading the thread:', error);
            } finally {
                this.loadingThread = false;
            }
        },

        closeThread() {
            this.activeUserId = null;
            this.thread = [];
        },

        // Appends the server's own copy to the open thread: the sender is not sent a live copy.
        async sendMessage(receiverId, content) {
            this.sending = true;
            try {
                const { data } = await api.post('/messages', { receiverId, content });
                const message = data.data;
                if (this.activeUserId === receiverId) this.thread.push(message);
                this.touch(receiverId, message, true);
                return message;
            } finally {
                this.sending = false;
            }
        },

        // A message pushed live ('message:new'). In the open thread it is shown and read at once;
        // from anyone else it bumps that person's unread count.
        receive(message, myUserId) {
            const otherId = message.senderId === myUserId ? message.receiverId : message.senderId;
            this.touch(otherId, message, message.senderId === myUserId);

            if (message.senderId === myUserId) return;
            if (this.activeUserId === otherId) {
                this.thread.push(message);
                // reading it as it arrives: tell the server, so it stays read
                api.get(`/messages/${otherId}`).catch(() => {});
            } else {
                this.bump(otherId);
            }
        },

        // keeps the conversation list's last message and order current
        touch(otherId, message, fromMe) {
            const row = { userId: otherId, lastMessage: message.content, lastMessageAt: message.createdAt, fromMe };
            const at = this.conversations.findIndex(c => c.userId === otherId);
            if (at === -1) {
                this.conversations.unshift({ ...row, unreadCount: 0 });
            } else {
                Object.assign(this.conversations[at], row);
                this.conversations.sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
            }
        },

        // a message arrived from this person
        bump(senderId) {
            const member = this.roster.find(m => m.id === senderId);
            if (member) member.unreadCount = (member.unreadCount || 0) + 1;
            const conversation = this.conversations.find(c => c.userId === senderId);
            if (conversation) conversation.unreadCount = (conversation.unreadCount || 0) + 1;
        },

        // their thread was opened, so it is all read
        clear(userId) {
            const member = this.roster.find(m => m.id === userId);
            if (member) member.unreadCount = 0;
            const conversation = this.conversations.find(c => c.userId === userId);
            if (conversation) conversation.unreadCount = 0;
        },
    },
});
