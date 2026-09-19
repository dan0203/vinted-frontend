import { useCallback, useState } from 'react';

// A url can outlive its Cloudinary asset, which renders a broken icon just like
// a missing url does. Remember the ones seen failing so the fallback shows
// everywhere that asset appears: the seed's image pool and a seller avatar are
// referenced by several cards at once.
export const useBrokenUrls = () => {
    const [brokenUrls, setBrokenUrls] = useState(() => new Set());

    // Stable identities, so a page can list reset in an effect's dependencies
    // without re-running the effect on every render.
    const markBroken = useCallback(url => setBrokenUrls(current => new Set(current).add(url)), []);
    const reset = useCallback(() => setBrokenUrls(new Set()), []);

    return {
        // The url to actually render: null once it has been seen failing.
        usable: url => (url && !brokenUrls.has(url) ? url : null),
        markBroken,
        reset,
    };
};
