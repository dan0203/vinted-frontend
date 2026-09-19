import './Offer.css';
import { Link, useParams } from 'react-router';
import { useState, useEffect } from 'react';
import axios from 'axios';
import Avatar from '../../components/Avatar/Avatar';
import ErrorMessage from '../../components/ErrorMessage/ErrorMessage';
import { imageUrl } from '../../utils/images';
import { useBrokenUrls } from '../../utils/useBrokenUrls';

const DETAIL_LABELS = {
    brand: 'Marque',
    size: 'Taille',
    color: 'Couleur',
    condition: 'État',
    city: 'Emplacement',
};

const STATUS_LABELS = {
    reserved: 'Réservé',
    sold: 'Vendu',
};

const MAX_SECONDARY_PICTURES = 5;

// Thumbnails render at 72x96 CSS pixels (Offer.css), so they ask Cloudinary for
// a 2x crop instead of the 800x1000 original. Keep both sides in sync.
// A non-Cloudinary url is left untouched.
const thumbnailUrl = url => url.replace('/image/upload/', '/image/upload/w_144,h_192,c_fill/');

const buildPictureList = offer => {
    const secondary = Array.isArray(offer.pictures)
        ? offer.pictures.slice(0, MAX_SECONDARY_PICTURES)
        : [];

    return [offer.image, ...secondary]
        // Image subdocuments carry no _id, and public_id is not unique within an
        // offer: the API serves offers whose main image is repeated in pictures.
        // The position is what makes a key unique here.
        .map((picture, index) => {
            const url = imageUrl(picture);
            return {
                key: `${picture?.public_id ?? 'picture'}-${index}`,
                url,
                thumbnail: url && thumbnailUrl(url),
            };
        })
        .filter(picture => picture.url);
};

const Offer = () => {
    const params = useParams();
    const [offer, setOffer] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedPictureIndex, setSelectedPictureIndex] = useState(0);
    // Tracked per url, not per picture: the thumbnail and the main image of one
    // photo have different urls since the thumbnail asks for a crop, so one can
    // fail while the other loads.
    const { usable, markBroken, reset: resetBrokenUrls } = useBrokenUrls();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await axios.get(
                    import.meta.env.VITE_API_URL + '/offers/' + params.id,
                );

                setOffer(response.data);
                setSelectedPictureIndex(0);
                resetBrokenUrls();
                setError(null);
            } catch (error) {
                setError(error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [params.id, resetBrokenUrls]);

    const pictures = buildPictureList(offer);
    // Clamp on render rather than in an effect: the list can only shrink under a
    // stale index, and a clamped index keeps the pressed thumbnail in sync with
    // the picture actually shown.
    const selectedIndex = Math.min(selectedPictureIndex, pictures.length - 1);
    const selectedPicture = pictures[selectedIndex];

    return isLoading ? (
        <p className="loading">Chargement en cours...</p>
    ) : error ? (
        <main className="main-offer">
            <div className="container">
                <ErrorMessage error={error} />
            </div>
        </main>
    ) : (
        <>
            <main className="main-offer">
                <div className="container">
                    <div className="offer-gallery">
                        {!selectedPicture ? (
                            <p className="offer-gallery-empty">Pas de photo</p>
                        ) : !usable(selectedPicture.url) ? (
                            <p className="offer-gallery-empty">Image indisponible</p>
                        ) : (
                            <img
                                className="offer-gallery-main"
                                src={selectedPicture.url}
                                alt={offer.name}
                                onError={() => markBroken(selectedPicture.url)}
                            />
                        )}
                        {pictures.length > 1 && (
                            <ul className="offer-gallery-thumbs">
                                {pictures.map((picture, index) => (
                                    <li key={picture.key}>
                                        <button
                                            type="button"
                                            className={
                                                index === selectedIndex ? 'is-selected' : undefined
                                            }
                                            aria-pressed={index === selectedIndex}
                                            aria-label={`Photo ${index + 1} sur ${pictures.length}`}
                                            onClick={() => setSelectedPictureIndex(index)}
                                        >
                                            {!usable(picture.thumbnail) ? (
                                                <span className="offer-gallery-thumb-empty" />
                                            ) : (
                                                <img
                                                    src={picture.thumbnail}
                                                    alt={offer.name}
                                                    onError={() => markBroken(picture.thumbnail)}
                                                />
                                            )}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    <aside>
                        <p className="product_price">
                            {offer.price} €
                            {offer.status && offer.status !== 'available' && (
                                <span className="offer-status-badge">
                                    {STATUS_LABELS[offer.status] ?? offer.status}
                                </span>
                            )}
                        </p>
                        <div className="product_details_wrapper">
                            {Object.entries(offer.details ?? {}).map(([key, value]) => (
                                <div key={key} className="product_details">
                                    <p className="product_details_key">
                                        {DETAIL_LABELS[key] ?? key}
                                    </p>
                                    <p className="product_details_value">{value}</p>
                                </div>
                            ))}
                        </div>
                        <p className="product_name">{offer.name}</p>
                        <p className="product_description">{offer.description}</p>
                        <p className="user-info">
                            <Avatar account={offer.owner.account} />
                            <span>{offer.owner.account.username}</span>
                        </p>

                        <h1>{offer.name}</h1>

                        {!offer.status || offer.status === 'available' ? (
                            <Link
                                to="/payment"
                                state={{
                                    title: offer.name,
                                    price: offer.price,
                                    id: offer._id,
                                }}
                            >
                                <button>Acheter</button>
                            </Link>
                        ) : (
                            <button disabled>Acheter</button>
                        )}
                    </aside>
                </div>
            </main>
        </>
    );
};

export default Offer;
