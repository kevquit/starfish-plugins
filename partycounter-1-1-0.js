module.exports = (api) => {
    api.metadata({
        name: 'partycounter',
        displayName: 'Party Counter',
        prefix: '§bPC',
        version: '1.1.0',
        author: 'kevquit',
        description: 'Detects party joins and leaves.'
    });

    const configSchema = [
        { label: 'Join Notifications', description: 'Enable or disable join notifications.', defaults: { joinEnabled: true }, settings: [{ type: 'toggle', key: 'joinEnabled', text: ['OFF','ON'], description: 'Enable join notifications.' }] },
        { label: 'Leave Notifications', description: 'Enable or disable leave notifications.', defaults: { leaveEnabled: true }, settings: [{ type: 'toggle', key: 'leaveEnabled', text: ['OFF','ON'], description: 'Enable leave notifications.' }] },
        { label: 'Delay', description: 'Set the grouping delay.', defaults: { delay: 200 }, settings: [{ type: 'cycle', key: 'delay', displayLabel: 'Input Delay', description: 'Delay before grouping joins/leaves.', values: [50,100,150,200,250,300,350,400].map(v=>({text:v+'ms',value:v})) }] }
    ];

    api.initializeConfig(configSchema);
    api.configSchema(configSchema);

    let c = 0, t, lastMaxPlayers = 0;

    api.on('chat', e => {
        const msg = e.message.replace(/§./g,'');
        const delay = api.config.get('delay');

        const match = msg.match(/\((\d+)\/(\d+)\)!$/);
        if(match) lastMaxPlayers = parseInt(match[2]);

        const join = api.config.get('joinEnabled') && /has joined \(\d+\/\d+\)!$/.test(msg);
        const leave = api.config.get('leaveEnabled') && /has quit!$/.test(msg);

        if(join || leave){
            c++;
            clearTimeout(t);
            t = setTimeout(() => {
                if(shouldPrint(c,lastMaxPlayers)){
                    const arrow = join ? '»' : '«';
                    const color = join ? '§b' : '§3';
                    api.chat(`${api.getPrefix()} §8${arrow} §7Party of ${color}${c} §7${join?'joined':'left'}.`);
                }
                c = 0;
            }, delay);
        }
    });

    function shouldPrint(count,maxPlayers){
        if(maxPlayers===8) return false;
        return count>=2 && count<=Math.floor(maxPlayers/4);
    }
};
