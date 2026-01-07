// Fake Chat Plugin
// by kevquit - v1.0.0

module.exports = (api) => {
    api.metadata({
        name: 'fc',
        displayName: 'Fake Chat',
        prefix: '',
        version: '1.0.0',
        author: 'kevquit',
        description: 'Client-side only chat messages with minecraft formatting codes',
    });

    const fakeChat = new FakeChat(api);
    fakeChat.registerHandlers();
    return fakeChat;
};

class FakeChat {
    // Ignore this, just setting up the functionality & command (thanks chivenant for code)
    constructor(api) {
        this.api = api;
        this.unsubscribeFunctions = [];}
    registerHandlers() {
        this.cleanup();
        const unsubChat = this.api.intercept(
            'packet:client:chat',
            this.onClientChat.bind(this));
        if (unsubChat) this.unsubscribeFunctions.push(unsubChat);
        const unsubRestore = this.api.on(
            'plugin_restored',
            this.onPluginRestored.bind(this));
        if (unsubRestore) this.unsubscribeFunctions.push(unsubRestore);}
    cleanup() {
        for (const unsub of this.unsubscribeFunctions) {
            if (typeof unsub === 'function') unsub();}
        this.unsubscribeFunctions = []; }
    onPluginRestored(event) {
        if (event.pluginName === 'fc') {
            this.registerHandlers();}}


    // Here's where the actual command logic starts
    onClientChat(event) {
        // code to cancel chat packets
        const message = event.data?.message;
        if (!message || !message.startsWith('/')) return;
        const raw = message.substring(1);
        const lower = raw.toLowerCase();
        if (lower !== 'fc' && !lower.startsWith('fc ')) return;
        event.cancel();

        // allow /fc and /fc info to exist
        if (lower === 'fc' || lower === 'fc info') {
            this.showInfo();
            return;
        }

        // missing parameters rerouting (to commands menu)
        const match = raw.match(/^fc\s+print\s+([\s\S]*)$/i);
        if (!match) {
            this.api.chat('§8-----------------------------------------------------')
            this.api.chat('§6Fake Chat Commands');
            this.api.chat('§e/fc print §7<<message...>>');
            this.api.chat('§e/fc info §7(/fc)');
            this.api.chat('§8-----------------------------------------------------')
            return;
        }

        let msg = match[1];
        if (!msg || !msg.trim()) return;

        // color codes converting & new line handling
        msg = msg.replace(/&([0-9a-fk-or])/gi, '§$1');
        const lines = msg.split('\\n');
        for (const line of lines) {
            this.api.chat(line.trim());
        }
    }

    showInfo() { 
        this.api.chat( "§8-----------------------------------------------------\n" + 
        "§6Fake Chat Plugin §8§l| §7Command Information\n\n" + 
        "§eCommand\n" + 
        " §8➴ §6/fc print §7<message...>\n\n" + 
        "§eFormatting\n" + 
        " §8▪ §fColors: §00 §11 §22 §33 §44 §55 §66 §77 §88 §99 §aa §bb §cc §dd §ee §ff\n" + 
        " §8▪ §fStyles: §7(§f&l§7) §lBold§r§7, §7(§f&o§7) §oItalic§r§7, §7(§f&n§7) §nUnderline§r§7, §7(§f&m§7) §mStrike§r\n\n" + 
        "§6Example\n" + 
        " §8» §f/fc print &6§6Fake §f&e§eChat §f&f§fPlugin!\n" + 
        "§8-----------------------------------------------------" ); 
    }
}
