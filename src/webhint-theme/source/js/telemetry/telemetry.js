"use strict";
(function () {
    const activityKey = 'webhint-activity';
    const storage = window.localStorage;
    const telemetryApiEndpoint = '';
    let nameKey = '';
    let sendTimeout = null;
    let telemetryQueue = [];
    let options = {
        batchDelay: 15000,
        defaultProperties: {},
        enabled: false,
        instrumentationKey: '8ef2b55b-2ce9-4c33-a09a-2c3ef605c97d',
        post: (url, data) => {
            return Promise.resolve(200);
        }
    };

    const sendTelemetry = async () => {
        if (sendTimeout) {
            clearTimeout(sendTimeout);
            sendTimeout = null;
        }
        const data = JSON.stringify(telemetryQueue);
        telemetryQueue = [];
        try {
            const status = await options.post(telemetryApiEndpoint, data);
            if (status !== 200) {
                console.warn('Failed to send telemetry: ', status);
            }
        }
        catch (err) {
            console.warn('Failed to send telemetry: ', err);
        }
    };

    const track = async (type, data) => {
        telemetryQueue.push({
            data: {
                baseData: {
                    name: data.name,
                    properties: Object.assign(Object.assign({}, options.defaultProperties), data.properties),
                    ver: 2
                },
                baseType: `${type}Data`
            },
            iKey: options.instrumentationKey,
            name: `Microsoft.ApplicationInsights.${nameKey}.${type}`,
            time: new Date().toISOString()
        });
        if (!options.batchDelay) {
            await sendTelemetry();
        }
        else if (!sendTimeout) {
            sendTimeout = setTimeout(sendTelemetry, options.batchDelay);
        }
    };

    const trackEvent = async (name, properties) => {
        await track('Event', { name, properties });
    };

    const testAsync = async () => {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve('resolved');
          }, 2000);
        });
      }

    const getISODateString = () => {
        const date = new Date(Date.now());
        date.setUTCHours(0);
        date.setUTCMinutes(0);
        date.setUTCSeconds(0);
        date.setUTCMilliseconds(0);
        return date.toISOString();
    };
    const getDaysBetweenUpdates = (currentUpdate, lastUpdated) => {
        if (!lastUpdated) {
            return 1;
        }
        const deltaMS = new Date(currentUpdate).getTime() - new Date(lastUpdated).getTime();
        return deltaMS / 1000 / 60 / 60 / 24;
    };
    const initializeActivity = () => {
        const lastUpdated = '';
        const last28Days = ''.padEnd(28, '0');
        return { last28Days, lastUpdated };
    };
    const getUpdatedActivity = (previousActivity) => {
        const activity = JSON.parse(previousActivity) || initializeActivity();
        const currentUpdate = getISODateString();
        const delta = getDaysBetweenUpdates(currentUpdate, activity.lastUpdated);
        if (delta < 1) {
            return null;
        }
        activity.last28Days = '1'.padEnd(Math.min(delta, 28), '0') + activity.last28Days.slice(0, -delta);
        activity.lastUpdated = currentUpdate;
        return activity;
    };

    /**
     * Report once per UTC day that a user is active (has run a scan).
     * Data includes `last28Days` (e.g. `"1001100110011001100110011001"`)
     * and `lastUpdated` (e.g. `"2019-10-04T00:00:00.000Z"`).
     */
    // Don't count a user as active if telemetry is disabled.

    const activity = getUpdatedActivity(storage.getItem(activityKey));
    if (activity) {
        storage.setItem(activityKey, JSON.stringify(activity));
        trackEvent('online-scanner-activity', activity);
    }
}());