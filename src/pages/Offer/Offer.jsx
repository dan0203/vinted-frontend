import './Offer.css';
import { Link, useParams } from 'react-router';
import { useState, useEffect } from 'react';
import axios from 'axios';
import ErrorMessage from '../../components/ErrorMessage/ErrorMessage';

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

// `url` is plain http and gets blocked as mixed content over https, so the
// Cloudinary subdocuments are read secure_url first. An offer with no photo
// sends `image: {tags: []}`, never a falsy value, hence the null for an entry
// with neither url.
const pictureUrl = picture => picture?.secure_url || picture?.url || null;

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
            const url = pictureUrl(picture);
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

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await axios.get(
                    import.meta.env.VITE_API_URL + '/offers/' + params.id,
                );

                setOffer(response.data);
                setSelectedPictureIndex(0);
                setError(null);
            } catch (error) {
                setError(error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [params.id]);

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
                    {selectedPicture && (
                        <div className="offer-gallery">
                            <img
                                className="offer-gallery-main"
                                src={selectedPicture.url}
                                alt={offer.name}
                            />
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
                                                <img src={picture.thumbnail} alt={offer.name} />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}
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
                            {offer.owner.account.avatar && (
                                <img
                                    src={offer.owner.account.avatar.url}
                                    alt={offer.owner.account.username}
                                />
                            )}
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
