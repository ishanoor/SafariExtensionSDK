//
//  shared.test.js
//  OneMeterSafariExtension
//
//  Created by Noor, Isha on 9/4/25.
//


global.chrome = {
    runtime: {
        lastError: null,
    },
    storage: {
        local: {
            data: {},
            
            get(keys, callback) {
                const result = {};
                for (const key of keys) {
                    if (this.data[key]) result[key] = this.data[key];
                }
                callback(result);
            },
            
            set(items, callback) {
                this.data = { ...this.data, ...items };
                callback();
            }
        }
    }
};

const {
    getOrCreateExtensionId,
    generateUUID,
    storeExtensionUniqueID,
    fetchAuthHash,
    storeAuthHashOnStorage,
    getOrCreateEnvironmentURL,
    sendVisitedUrls,
    sendWaypoint,
    getAppVersion,
    getAuthHashFromBE,
} = require('./shared.test-export');


describe('getOrCreateExtensionId', () => {
    beforeEach(() => {
        // Reset global.chrome and clear any lastError
        global.chrome = {
            runtime: {
                lastError: null,
            },
            storage: {
                local: {
                    get: jest.fn(),
                    set: jest.fn(),
                },
            },
        };
    });
    
    it('should return existing extension_unique_id from storage', async () => {
        chrome.storage.local.get.mockImplementation((keys, callback) => {
            callback({ extension_unique_id: 'existing-id' });
        });
        
        const result = await getOrCreateExtensionId();
        expect(result).toBe('existing-id');
    });
    
    it('should generate and store a new ID if not present', async () => {
        chrome.storage.local.get.mockImplementation((keys, callback) => {
            callback({});
        });
        
        chrome.storage.local.set.mockImplementation((obj, callback) => {
            callback();
        });
        
        const result = await getOrCreateExtensionId();
        
        // Just check it looks like a UUID
        expect(result).toMatch(
                               /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
                               );
        
        expect(chrome.storage.local.set).toHaveBeenCalledWith(
                                                              { extension_unique_id: result },
                                                              expect.any(Function)
                                                              );
    });
    
    it('should reject if chrome.runtime.lastError is set during get', async () => {
        chrome.runtime.lastError = { message: 'Get error' };
        
        chrome.storage.local.get.mockImplementation((keys, callback) => {
            callback({});
        });
        
        await expect(getOrCreateExtensionId()).rejects.toEqual({ message: 'Get error' });
        
        chrome.runtime.lastError = null;
    });
    
    it('should reject if chrome.runtime.lastError is set during set', async () => {
        chrome.storage.local.get.mockImplementation((keys, callback) => {
            callback({});
        });
        
        chrome.runtime.lastError = { message: 'Set error' };
        
        chrome.storage.local.set.mockImplementation((obj, callback) => {
            callback();
        });
        
        await expect(getOrCreateExtensionId()).rejects.toEqual({ message: 'Set error' });
        
        chrome.runtime.lastError = null;
    });
});

describe('generateUUID', () => {
    it('should generate a UUID-like string', () => {
        const uuid = generateUUID();
        expect(uuid).toMatch(
                             /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
                             );
    });
});


describe('storeExtensionUniqueID', () => {
    beforeEach(() => {
        global.browser = {
            runtime: {
                sendNativeMessage: jest.fn(),
                lastError: null
            }
        };
        console.error = jest.fn();
        console.log = jest.fn();
    });
    
    afterEach(() => {
        jest.resetAllMocks();
    });
    
    it('sends the unique ID to the native app and logs success', () => {
        const callback = jest.fn();
        browser.runtime.sendNativeMessage.mockImplementation((app, message, cb) => {
            cb({ success: true });
        });
        
        storeExtensionUniqueID('12345');
        
        expect(browser.runtime.sendNativeMessage).toHaveBeenCalledWith(
                                                                       'group.com.netquest.onemeter',
                                                                       { extensionId: '12345' },
                                                                       expect.any(Function)
                                                                       );
        
        expect(console.error).not.toHaveBeenCalled();
        expect(console.log).toHaveBeenCalledWith('Extension ID sent to native app successfully');
    });
    
    it('logs an error if browser.runtime.lastError is present', () => {
        browser.runtime.lastError = { message: 'Something went wrong' };
        
        browser.runtime.sendNativeMessage.mockImplementation((app, message, cb) => {
            cb(null);
        });
        
        storeExtensionUniqueID('67890');
        
        expect(console.error).toHaveBeenCalledWith(
                                                   'Error sending message to native app: [object Object]'
                                                   );
        expect(console.log).not.toHaveBeenCalled();
    });
});

describe('fetchAuthHash', () => {
    const originalFetch = global.fetch;
    
    beforeEach(() => {
        global.fetch = jest.fn();
        global.chrome = {
            storage: {
                local: {
                    get: jest.fn(),
                    set: jest.fn().mockResolvedValue(undefined),
                },
            },
            runtime: {
                lastError: null,
            },
        };
        console.error = jest.fn();
        console.log = jest.fn();
    });
    
    afterEach(() => {
        jest.resetAllMocks();
        global.fetch = originalFetch;
    });
    
    it('fetches and stores auth hash successfully', async () => {
        // Setup chrome.storage.local.get to return a valid URL
        chrome.storage.local.get.mockImplementation((keys, callback) => {
            callback({ urlEndPoint: 'https://example.com' });
        });
        
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => ({ auth_hash: 'abc123' }),
        });
        
        const result = await fetchAuthHash('unique-123');
        
        expect(fetch).toHaveBeenCalledWith(
                                           'https://example.com/v3/safari_extension/auth_hash?extension_unique_id=unique-123',
                                           {
                                               method: 'GET',
                                               headers: { 'Content-Type': 'application/json' },
                                           }
                                           );
        
        expect(chrome.storage.local.set).toHaveBeenCalledWith({ authHash: 'abc123' });
        expect(console.log).toHaveBeenCalledWith('Auth Hash value is set');
        expect(result).toBe('abc123');
    });
    
    it('returns null and logs an error on fetch failure', async () => {
        chrome.storage.local.get.mockImplementation((keys, callback) => {
            callback({ urlEndPoint: 'https://example.com' });
        });
        
        global.fetch.mockRejectedValue(new Error('Network error'));
        
        const result = await fetchAuthHash('unique-456');
        
        expect(result).toBeNull();
        expect(console.error).toHaveBeenCalledWith('Error fetching auth_hash:', expect.any(Error));
        expect(chrome.storage.local.set).not.toHaveBeenCalled();
    });
    
    it('handles missing auth_hash in response', async () => {
        chrome.storage.local.get.mockImplementation((keys, callback) => {
            callback({ urlEndPoint: 'https://example.com' });
        });
        
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => ({ no_auth: 'oops' }),
        });
        
        const result = await fetchAuthHash('unique-789');
        
        expect(console.error).toHaveBeenCalledWith(
                                                   'auth_hash not found in response',
                                                   { no_auth: 'oops' }
                                                   );
        expect(result).toBeNull();
    });
});

describe('sendVisitedUrls', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn();
    console.log = jest.fn();
    console.error = jest.fn();

    global.chrome = {
      runtime: {
        lastError: null,
      },
      storage: {
        local: {
          data: {
            urlEndPoint: 'https://api.example.com',
          },
          get(keys, callback) {
            const result = {};
            for (const key of keys) {
              if (this.data[key]) {
                result[key] = this.data[key];
              }
            }
            callback(result);
          },
          set(items, callback) {
            this.data = { ...this.data, ...items };
            if (callback) callback();
          }
        }
      }
    };
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.resetAllMocks();
  });

  it('sends visited URLs successfully', async () => {
    const authHash = 'abc123';
    const urlData = ['https://example.com/page1'];

    fetch.mockResolvedValue({
      ok: true,
    });

    await sendVisitedUrls(authHash, urlData);

    expect(fetch).toHaveBeenCalledWith(
      'https://api.example.com/v3/safari_extension/visited_urls?auth_hash=abc123',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visited_urls: urlData }),
      }
    );

    expect(console.log).toHaveBeenCalledWith('Visited URLs sent successfully:', urlData);
  });

  it('logs an error if fetch fails', async () => {
    fetch.mockRejectedValue(new Error('Network down'));

    await sendVisitedUrls('bad-auth', ['https://fail.com']);

    expect(console.error).toHaveBeenCalledWith(
      'Error sending visited URLs:',
      expect.any(Error)
    );
  });

  it('logs an error if response is not ok', async () => {
    fetch.mockResolvedValue({
      ok: false,
      status: 403,
    });

    await sendVisitedUrls('bad-auth', ['https://fail.com']);

    expect(console.error).toHaveBeenCalledWith(
      'Error sending visited URLs:',
      expect.any(Error)
    );
  });
});

describe('sendWaypoint', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn();
    console.log = jest.fn();
    console.error = jest.fn();

    global.chrome = {
      runtime: { lastError: null },
      storage: {
        local: {
          get: jest.fn(),
          set: jest.fn((items, callback) => callback?.()),
        },
      },
    };
  });

  afterEach(() => {
    jest.resetAllMocks();
    global.fetch = originalFetch;
  });

  it('sends waypoint successfully', async () => {
    const waypoint = { location: 'Point A' };
    const sortIndex = 1;

    // Provide all necessary data for real helper functions
    chrome.storage.local.get.mockImplementation((keys, callback) => {
      const data = {};
      if (keys.includes('urlEndPoint')) {
        data.urlEndPoint = 'https://example.com';
      }
      if (keys.includes('appVersion')) {
        data.appVersion = '1.2.3';
      }
      if (keys.includes('authHash')) {
        data.authHash = 'mock-auth-hash';
      }
      callback(data);
    });

    fetch.mockResolvedValue({ ok: true });

    await sendWaypoint(waypoint, sortIndex);

    expect(fetch).toHaveBeenCalledWith(
      'https://example.com/v3/waypoints?auth_hash=mock-auth-hash&os=ios&version=1.2.3',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auth_hash: 'mock-auth-hash',
          waypoint,
          sortIndex,
        }),
      }
    );

    expect(console.log).toHaveBeenCalledWith(
      'Waypoint sent successfully:',
      JSON.stringify({
        auth_hash: 'mock-auth-hash',
        waypoint,
        sortIndex,
      })
    );
  });
});
