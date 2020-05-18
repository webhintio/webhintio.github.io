"use strict";
(function () {
    const activityKey = 'webhint-activity';
    const productKey = 'webhint-online-scanner';
    const storage = window.localStorage;
    const telemetryApiEndpoint = 'https://webhint-telemetry.azurewebsites.net/api/log';
    let sendTimeout = null;
    let telemetryQueue = [];
    let options = {
        batchDelay: 15000,
        defaultProperties: {},
    };

    const post = async (url, data) => {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: data
        });
        return response;
    }

    const sendTelemetry = async () => {
        if (sendTimeout) {
            clearTimeout(sendTimeout);
            sendTimeout = null;
        }
        const data = JSON.stringify({
            product: productKey,
            data: telemetryQueue
        });

        telemetryQueue = [];
        try {
            post(telemetryApiEndpoint, data)
                .then(response => {
                    if (response.status !== 200) {
                        console.warn('Failed to send telemetry: ', status);
                    }
                });
        }
        catch (err) {
            console.warn('Failed to send telemetry: ', err);
        }
    };

    const track = async (type, data) => {
        telemetryQueue.push(
            {
                name: data.name,
                properties: Object.assign(Object.assign({}, options.defaultProperties), data.properties),
                ver: 2,
                type: `${type}Data`
            }
        );
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
