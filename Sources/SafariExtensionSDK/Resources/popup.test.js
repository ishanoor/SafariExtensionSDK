//
//  popup.test.js
//  OneMeterSafariExtension
//
//  Created by Noor, Isha on 9/4/25.
//

const {
    canAccessTabUrl,
    getUserLanguage,
    loadTranslations,
    applyTranslations,
} = require('./popup');

// Setup a global chrome mock
global.chrome = {
    tabs: {
        query: jest.fn(),
    },
};

describe('canAccessTabUrl', () => {
    it('should resolve true when tab url is not empty', async () => {
        // Mocking chrome.tabs.query
        chrome.tabs.query.mockImplementation((queryInfo, callback) => {
            callback([{ url: 'https://example.com' }]);
        });

        const result = await canAccessTabUrl();
        expect(result).toBe(true);
    });

    it('should resolve false when tab url is empty', async () => {
        chrome.tabs.query.mockImplementation((queryInfo, callback) => {
            callback([{ url: '' }]);
        });

        const result = await canAccessTabUrl();
        expect(result).toBe(false);
    });
});

describe('getUserLanguage', () => {
    it('should return supported language', () => {
        Object.defineProperty(global.navigator, 'language', {
            value: 'es-ES',
            configurable: true,
        });

        const lang = getUserLanguage();
        expect(lang).toBe('es');
    });

    it('should return "en" if language not supported', () => {
        Object.defineProperty(global.navigator, 'language', {
            value: 'zh-CN',
            configurable: true,
        });

        const lang = getUserLanguage();
        expect(lang).toBe('en');
    });
});

describe('loadTranslations', () => {
    beforeEach(() => {
        global.fetch = jest.fn(() =>
            Promise.resolve({
                json: () =>
                    Promise.resolve({
                        en: { title: 'Hello', description: 'Desc', warning: 'Warn', button: 'Go' },
                    }),
            })
        );
    });

    it('should fetch and return translations JSON', async () => {
        const data = await loadTranslations();
        expect(data).toHaveProperty('en');
        expect(data.en).toHaveProperty('title', 'Hello');
    });
});

describe('applyTranslations', () => {
    beforeEach(() => {
        // Mock document elements
        document.body.innerHTML = `
            <h1></h1>
            <div class="container"><p></p></div>
            <div class="warning-box"><p></p></div>
            <button id="grantPermissions"></button>
        `;

        // Stub internal functions
        jest.spyOn(global, 'fetch').mockResolvedValue({
            json: () =>
                Promise.resolve({
                    en: {
                        title: 'Hi',
                        description: 'Desc',
                        warning: '<b>Careful!</b>',
                        button: 'Start',
                    },
                }),
        });

        Object.defineProperty(global.navigator, 'language', {
            value: 'en-US',
            configurable: true,
        });
    });

    it('should apply translations to the DOM', async () => {
        await applyTranslations();
        expect(document.querySelector('h1').textContent).toBe('Hi');
        expect(document.querySelector('.container > p').textContent).toBe('Desc');
        expect(document.querySelector('.warning-box p').innerHTML).toBe('<b>Careful!</b>');
        expect(document.querySelector('#grantPermissions').textContent).toBe('Start');
    });
});
