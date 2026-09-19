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

// Nothing is known until an account's own read lands, so every account starts
// from here.
const NOTHING_KNOWN = { userId: null, ids: null, hasFailed: false, error: null };

// One instance per page, shared by every control on it: the favorites list is a
// single read, not one per card.
export const useFavorites = () => {
    // Read during render rather than held in state, so a login or a logout
    // re-renders straight into the right answer.
    const userId = getUserId();
    // Everything this hook remembers belongs to one account, so it is stored
    // with that account and read back through an ownership check. A session that
    // changes under a mounted page then reads as "nothing known yet" straight
    // away, rather than showing the previous user's hearts, their failed read,
    // or their error message (finding F-03).
    const [remembered, setRemembered] = useState(NOTHING_KNOWN);
    const {
        ids: favoriteIds,
        hasFailed,
        error,
    } = remembered.userId === userId ? remembered : NOTHING_KNOWN;

    // Every write goes through here, so none of them can land on an account
    // other than the one it was made for: a session that changes mid-toggle
    // leaves the stale answer where it fell.
    const updateMine = change =>
        setRemembered(current =>
            current.userId === userId ? { ...current, ...change(current) } : current,
        );

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
                setRemembered({
                    ...NOTHING_KNOWN,
                    userId,
                    ids: new Set((response.data.favorites ?? []).map(offer => offer._id)),
                });
            } catch {
                if (cancelled) return;

                setRemembered({ ...NOTHING_KNOWN, userId, hasFailed: true });
            }
        };

        fetchFavorites();

        return () => {
            cancelled = true;
        };
    }, [userId]);

    const flipLoaded = (offerId, shouldBeFavorite) =>
        updateMine(current =>
            current.ids ? { ids: flip(current.ids, offerId, shouldBeFavorite) } : {},
        );

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
        flipLoaded(offerId, !wasFavorite);
        clearError();

        try {
            const url = `/users/${userId}/favorites/${offerId}`;
            const response = wasFavorite ? await client.delete(url) : await client.post(url);

            // The answer describes the server at the instant it replied, so it
            // cannot know about another offer whose request is still open. It
            // settles this offer and no other: reading the whole list back
            // would drop that other offer's flip (finding F-27).
            const confirmed = new Set(response.data.favorites ?? []);
            flipLoaded(offerId, confirmed.has(offerId));
        } catch (error) {
            // Undo this offer alone rather than restoring a whole captured set,
            // which would take a concurrent toggle down with it.
            flipLoaded(offerId, wasFavorite);
            updateMine(() => ({ error }));
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
    // Still `[]`: clearing is the one write that needs no ownership check, since
    // dropping a message the caller has finished with is harmless on any account.
    // Returning `current` untouched when there is nothing to clear matters:
    // `Home` clears on every list load, and a fresh record for an unchanged value
    // would re-render the whole grid each time (finding F-07).
    const clearError = useCallback(
        () =>
            setRemembered(current =>
                current.error === null ? current : { ...current, error: null },
            ),
        [],
    );

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
