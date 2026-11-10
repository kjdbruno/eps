import { onMounted, onBeforeUnmount } from 'vue';
import { socket } from 'src/boot/socket';

// Keeps a list or a thread current without anyone pressing refresh. After a write (a discussion opened, a comment,
// a survey answered, an office answering your feedback...) the API tells every connected screen which MODULE changed
// ('data:changed' with { module, reason }); a page that shows that module's data loads it again.
//
//   useLiveRefresh(['discussion'], () => loadDiscussions({ quiet: true }));
//
//   modules   the modules this page shows ('complaint' is feedback)
//   refresh   what to load again (quietly: no spinner, nothing reset, whatever is being typed stays)
//
// The message carries no data, so it is safe to hear without an account: the public lists (discussions, surveys) are
// open to visitors too, so the connection is opened here when nothing has opened it yet.
export const useLiveRefresh = (modules, refresh, { wait = 700 } = {}) => {
    let timer = null;

    const fire = () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
            try {
                const result = refresh();
                if (result && typeof result.catch === 'function') result.catch(() => {});
            } catch (error) {
                console.error('Live refresh failed:', error);
            }
        }, wait);
    };
    const onChanged = (event) => {
        if (!modules.length || modules.includes(event?.module)) fire();
    };
    // feedback (complaints) has always had its own event
    const onComplaints = () => {
        if (!modules.length || modules.includes('complaint')) fire();
    };

    onMounted(() => {
        socket.on('data:changed', onChanged);
        socket.on('complaints:changed', onComplaints);
        socket.io.on('reconnect', fire);
        if (!socket.connected && !socket.active) socket.connect();
    });
    onBeforeUnmount(() => {
        clearTimeout(timer);
        socket.off('data:changed', onChanged);
        socket.off('complaints:changed', onComplaints);
        socket.io.off('reconnect', fire);
    });
};
