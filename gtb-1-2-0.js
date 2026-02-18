// Guess The Build Guesser Plugin | Version 1.1.0 (Cleaned)

const arrayData = [
	"initial_setup"
];

// Persistence (save added/removed themes)
let fsModule = null;
let dataFile = null;
try {
	fsModule = require('fs');
	const path = require('path');
	dataFile = path.join(__dirname, 'gtb-themes.json');
} catch (e) {
	fsModule = null;
}

function loadSavedThemes() {
	if (!fsModule || !dataFile) return;
	try {
		if (fsModule.existsSync(dataFile)) {
			const raw = fsModule.readFileSync(dataFile, 'utf8');
			const saved = JSON.parse(raw);
			if (Array.isArray(saved)) {
				saved.forEach(s => {
					if (!arrayData.find(x => x.toLowerCase() === (s || '').toLowerCase())) {
						arrayData.push(s);
					}
				});
			}
		}
	} catch (e) {}
}

function saveThemes() {
	if (!fsModule || !dataFile) return;
	try {
		fsModule.writeFileSync(dataFile, JSON.stringify(arrayData, null, 2), 'utf8');
	} catch (e) {}
}

module.exports = (api) => {
	try { loadSavedThemes(); } catch (e) {}

	api.metadata({
		name: 'gtb',
		displayName: 'Guess The Build',
		version: '1.2.0',
		author: 'kevquit',
		description: 'Private Plugin | Suggestions for GTB. Usage: /gtb <pattern>'
	});

	api.intercept('packet:client:chat', (event) => {
		const msg = event.data?.message;
		if (!msg) return;

		if (!msg.startsWith('/')) return;

		const raw = msg.slice(1);
		const lower = raw.toLowerCase();

		if (!lower.startsWith('gtb')) return;

		event.cancel();

		const rest = raw.slice(3).trim();
		const restLower = rest.toLowerCase();

		if (!rest || restLower === '' || restLower === 'help') {
			return help(api);
		}

		// /gtb add <theme>
		if (restLower.startsWith('add ')) {
			const theme = rest.slice(4).trim();
			if (!theme) {
				api.chat('§8[§6GTB§8] §cUsage: /gtb add <map theme>');
				return;
			}
			if (arrayData.findIndex(x => x.toLowerCase() === theme.toLowerCase()) !== -1) {
				api.chat('§8[§6GTB§8] §cTheme already exists: §e' + theme);
				return;
			}
			arrayData.push(theme);
			saveThemes();
			api.chat('§8[§6GTB§8] §aAdded theme: §e' + theme);
			return;
		}

		// /gtb remove <theme>
		if (restLower.startsWith('remove ')) {
			const theme = rest.slice(7).trim();
			if (!theme) {
				api.chat('§8[§6GTB§8] §cUsage: /gtb remove <map theme>');
				return;
			}
			const idx = arrayData.findIndex(x => x.toLowerCase() === theme.toLowerCase());
			if (idx === -1) {
				api.chat('§8[§6GTB§8] §cTheme not found: §e' + theme);
				return;
			}
			arrayData.splice(idx, 1);
			saveThemes();
			api.chat('§8[§6GTB§8] §aRemoved theme: §e' + theme);
			return;
		}

		// /gtb list [page]
		if (restLower === 'list' || restLower.startsWith('list ')) {
			let page = 1;
			const parts = rest.split(/\s+/);
			if (parts.length > 1) {
				const n = parseInt(parts[1], 10);
				if (!isNaN(n) && n > 0) page = n;
			}
			return showAllThemes(api, page);
		}

		// Pattern query
		const pattern = rest.toLowerCase();

		if (!/^[a-zA-Z_ ]+$/.test(pattern)) {
			api.chat('§8[§6GTB§8] §cInvalid pattern! Use letters and underscores only.');
			return;
		}

		processSuggestions(api, pattern);
	});
};

function help(api) {
	api.chat('§8-----------------------------');
	api.chat('§6Guess The Build Guesser');
	api.chat('§e/gtb §7<pattern>');
	api.chat('§7Use §f_§7 for unknown letters');
	api.chat('§e/gtb add §7<map theme>');
	api.chat('§e/gtb remove §7<map theme>');
	api.chat('§e/gtb list §7[page]');
	api.chat('§8Example: §f/gtb __a___');
	api.chat('§8-----------------------------');
}

function processSuggestions(api, pattern) {
	const matches = findMatches(pattern);

	if (matches.length === 0) {
		api.chat('§8[§6GTB§8] §cNo matches found for pattern: §e' + pattern);
		return;
	}

	if (matches.length > 100) {
		api.chat('§8[§6GTB§8] §cToo many matches (' + matches.length + '). Please be more specific!');
		return;
	}

	api.chat('§8[§6GTB§8] §6Suggestions §7[§a' + matches.length + ' matches§7]');
	api.chat('§7Pattern: §e' + pattern);

	const grouped = {};
	matches.forEach(item => {
		const firstLetter = item.charAt(0).toUpperCase();
		if (!grouped[firstLetter]) grouped[firstLetter] = [];
		grouped[firstLetter].push(item);
	});

	Object.keys(grouped).sort().forEach(letter => {
		const items = grouped[letter];
		const perLine = 8;

		for (let i = 0; i < items.length; i += perLine) {
			const slice = items.slice(i, i + perLine);
			const comp = { text: letter + ' - ', color: 'dark_aqua', bold: true, extra: [] };

			slice.forEach((name, idx) => {
				comp.extra.push({
					text: name,
					color: 'yellow',
					bold: true,
					clickEvent: { action: 'suggest_command', value: name }
				});
				if (idx < slice.length - 1) comp.extra.push({ text: ' • ', color: 'gold' });
			});

			api.chat(comp);
		}
	});
}

function matchPattern(pattern, item) {
	const p = pattern.toLowerCase();
	const i = item.toLowerCase();

	if (p.length !== i.length) return false;

	for (let x = 0; x < p.length; x++) {
		if (p[x] !== '_' && p[x] !== i[x]) return false;
	}
	return true;
}

function findMatches(pattern) {
	return arrayData.filter(item => matchPattern(pattern, item));
}

function showAllThemes(api, page) {
	const perPage = 20;
	const sorted = arrayData.slice().sort((a,b) => a.localeCompare(b));
	const total = sorted.length;
	const pages = Math.max(1, Math.ceil(total / perPage));

	if (page < 1) page = 1;
	if (page > pages) page = pages;

	api.chat('§8[§6GTB§8] §6All Themes §7[§a' + total + '§7] §8(Page §e' + page + '§8/§e' + pages + '§8)');

	const start = (page - 1) * perPage;
	const slice = sorted.slice(start, start + perPage);

	const perLine = 6;
	for (let i = 0; i < slice.length; i += perLine) {
		const sub = slice.slice(i, i + perLine);
		const comp = { text: '', extra: [] };

		sub.forEach((name, idx) => {
			comp.extra.push({
				text: name,
				color: 'yellow',
				bold: true,
				clickEvent: { action: 'suggest_command', value: name }
			});
			if (idx < sub.length - 1) comp.extra.push({ text: ' • ', color: 'gold' });
		});

		api.chat(comp);
	}

	if (pages > 1) api.chat('§7Use §e/gtb list <page> §7to view other pages.');
}
