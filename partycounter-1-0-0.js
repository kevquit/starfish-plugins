module.exports = api => {
    api.metadata({
        name: 'Party Counter',
        displayName: 'Party Counter',
        prefix: '§bPC',
        version: '1.0.0',
        author: 'kevquit',
        description: 'Detects party joins.'
    });

    let c = 0, t;

    api.on('chat', e => {
        if (!api.config.get('enabled')) return;
        if (!/has joined \(\d+\/\d+\)!$/.test(e.message.replace(/§./g,''))) return;

        c++; clearTimeout(t);
        t = setTimeout(() => {
            if (c > 1 && c <= 4)
                api.chat(`${api.getPrefix()} §7Party of §b${c} §7joined.`);
            c = 0;
        }, 400); // Replace the number in this line for delay (in milliseconds)
    });
};
