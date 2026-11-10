import { onMounted, onBeforeUnmount } from 'vue';
import { socket } from 'src/boot/socket';

// Keeps a page current without anyone pressing refresh. After a write (a discussion opened, a CSM report recorded, a
// survey answered...) the API tells every connected screen which MODULE changed ('data:changed' with
// { module, reason }, see api utils/realtime.js); a page that shows that module's data loads it again.
//
//   useLiveRefresh(['discussion'], () => loadDiscussions({ quiet: true }));
//
//   modules   the modules this page shows; an empty list means any change at all
//   refresh   what to load again (do it quietly: no spinner, no reset of what the person is looking at)
//
// Changes that arrive together (a write usually logs, notifies and broadcasts) cause one reload, not several, and
// the page also loads again when the connection comes back after a drop, since changes may have been missed.
export const useLiveRefresh = (modules, refresh, { wait = 600 } = {}) => {
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
    });
    onBeforeUnmount(() => {
        clearTimeout(timer);
        socket.off('data:changed', onChanged);
        socket.off('complaints:changed', onComplaints);
        socket.io.off('reconnect', fire);
    });
};
