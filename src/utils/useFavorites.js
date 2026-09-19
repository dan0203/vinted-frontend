import { useCallback, useEffect, useState } from 'react';
import client, { getUserId } from '../api/client';

const flip = (ids, offerId, shouldBeFavorite) => {
    const next = new Set(ids);

    if (shouldBeFavorite) {
        next.add(offerId);
    } else {
        next.delete(offerId);
    }

    return next;
};

// One instance per page, shared by every control on it: the favorites list is a
// single read, not one per card.
export const useFavorites = () => {
    // Read during render rather than held in state, so a login or a logout
    // re-renders straight into the right answer.
    const userId = getUserId();
    // null until the list has arrived. The difference between "not favorited"
    // and "not known yet" is what keeps an optimistic flip honest.
    const [favoriteIds, setFavoriteIds] = useState(null);
    const [hasFailed, setHasFailed] = useState(false);
    const [error, setError] = useState(null);
    // Offers whose toggle is in flight. One request at a time per offer, so a
    // double-click cannot send an add and a remove that race each other.
    const [pendingIds, setPendingIds] = useState(() => new Set());

    useEffect(() => {
        if (!userId) {
            return;
        }

        let cancelled = false;

        const fetchFavorites = async () => {
            try {
                // skipAuthRedirect: this read is background work on a page the
                // user asked for, so a session that cannot refresh must not
                // throw them out to /login mid-browse.
                const response = await client.get(`/users/${userId}/favorites`, {
                    skipAuthRedirect: true,
                });

                if (cancelled) return;

                // The read returns whole offers; only their ids matter here.
                setFavoriteIds(new Set((response.data.favorites ?? []).map(offer => offer._id)));
                setHasFailed(false);
            } catch {
                if (cancelled) return;

                setHasFailed(true);
            }
        };

        fetchFavorites();

        return () => {
            cancelled = true;
        };
    }, [userId]);

    // A plain function, not a useCallback: both call sites wrap it in a fresh
    // arrow and it sits in no dependency array, so a memoized identity would
    // promise a stability nothing here uses.
    const toggle = async offerId => {
        if (!userId || favoriteIds === null || pendingIds.has(offerId)) {
            return;
        }

        const wasFavorite = favoriteIds.has(offerId);

        setPendingIds(current => new Set(current).add(offerId));
        // Functional, so a toggle already in flight on another offer keeps its
        // own optimistic flip.
        setFavoriteIds(current => flip(current, offerId, !wasFavorite));
        setError(null);

        try {
            const url = `/users/${userId}/favorites/${offerId}`;
            const response = wasFavorite ? await client.delete(url) : await client.post(url);

            // The answer describes the server at the instant it replied, so it
            // cannot know about another offer whose request is still open. It
            // settles this offer and no other: reading the whole list back
            // would drop that other offer's flip (finding F-27).
            const confirmed = new Set(response.data.favorites ?? []);
            setFavoriteIds(current => flip(current, offerId, confirmed.has(offerId)));
        } catch (error) {
            // Undo this offer alone rather than restoring a whole captured set,
            // which would take a concurrent toggle down with it.
            setFavoriteIds(current => flip(current, offerId, wasFavorite));
            setError(error);
        } finally {
            setPendingIds(current => {
                const next = new Set(current);
                next.delete(offerId);
                return next;
            });
        }
    };

    // This one is memoized, unlike `toggle`: the offers list calls it from the
    // effect that refetches on search, filter and page changes, so it has to be
    // stable enough to sit in that effect's dependencies.
    const clearError = useCallback(() => setError(null), []);

    return {
        // Signed out, or the list could not be read: the caller renders no
        // control rather than a dead one.
        isAvailable: Boolean(userId) && !hasFailed,
        isLoaded: favoriteIds !== null,
        isFavorite: offerId => favoriteIds?.has(offerId) ?? false,
        isPending: offerId => pendingIds.has(offerId),
        toggle,
        error,
        clearError,
    };
};
