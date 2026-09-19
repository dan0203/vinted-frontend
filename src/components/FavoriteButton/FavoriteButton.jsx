import './FavoriteButton.css';
import { HiHeart, HiOutlineHeart } from 'react-icons/hi2';

const FavoriteButton = ({ isFavorite, isLoaded, isPending, onToggle }) => {
    const label = isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris';

    return (
        <button
            type="button"
            className={`favorite-button${isFavorite ? ' is-favorite' : ''}`}
            // Two reasons to refuse a click. Until the list has arrived the
            // heart shows a default, not a fact, and toggling from it would
            // send the opposite call to the one the user means. While this
            // offer's own request is in flight, a second click would race it.
            disabled={!isLoaded || isPending}
            aria-pressed={isFavorite}
            aria-label={label}
            title={label}
            onClick={onToggle}
        >
            {isFavorite ? <HiHeart /> : <HiOutlineHeart />}
        </button>
    );
};

export default FavoriteButton;
