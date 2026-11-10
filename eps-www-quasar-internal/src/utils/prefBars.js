// The little breakdown bars of the Preference overviews: [{ label, count, color }] -> rows with a share and a colour.
// Colours come as Quasar names from the sections; the bars are drawn with plain colours.
const HEX = {
    positive: '#21BA45', primary: '#204888', warning: '#FFC900', info: '#68AFF1', negative: '#C10015',
    'grey-6': '#B8C2D4', grey: '#B8C2D4',
};

export const toBars = (items) => {
    const total = items.reduce((n, i) => n + (i.count || 0), 0);
    return items.map(i => ({ ...i, hex: i.hex || HEX[i.color] || '#204888', pct: total ? Math.round(((i.count || 0) / total) * 100) : 0 }));
};
