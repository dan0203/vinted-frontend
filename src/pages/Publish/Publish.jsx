import './Publish.css';
import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router';
import client from '../../api/client';
import ErrorMessage from '../../components/ErrorMessage/ErrorMessage';

const MAX_SECONDARY_PICTURES = 5;

const TOO_MANY_PICTURES = `Tu peux ajouter au maximum ${MAX_SECONDARY_PICTURES} photos supplémentaires.`;
const MISSING_PICTURE = 'Ajoute une photo principale pour publier ton article.';

const Publish = ({ token }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [brand, setBrand] = useState('');
    const [size, setSize] = useState('');
    const [color, setColor] = useState('');
    const [condition, setCondition] = useState('');
    const [city, setCity] = useState('');
    const [price, setPrice] = useState('');
    const [picture, setPicture] = useState(null);
    const [pictures, setPictures] = useState([]);
    const [error, setError] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [published, setPublished] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async event => {
        event.preventDefault();
        setError(null);

        if (!picture) {
            setError(MISSING_PICTURE);
            return;
        }

        if (pictures.length > MAX_SECONDARY_PICTURES) {
            setError(TOO_MANY_PICTURES);
            return;
        }

        const formData = new FormData();
        formData.append('picture', picture);
        // Secondary photos repeat the same field name, which is how the backend
        // file middleware turns them back into an array.
        pictures.forEach(file => formData.append('pictures', file));
        formData.append('title', title);
        formData.append('description', description);
        formData.append('price', price);
        formData.append('brand', brand);
        formData.append('size', size);
        formData.append('color', color);
        formData.append('condition', condition);
        formData.append('city', city);

        setSubmitting(true);

        try {
            const response = await client.post('/offers/publish', formData);
            const id = response.data?._id;

            if (id) {
                navigate(`/offers/${id}`, { state: { published: true } });
                return;
            }

            // No id to navigate to, so the confirmation stays here rather than
            // sending the seller to a page that cannot be built.
            setPublished(true);
        } catch (error) {
            setError(error);
        } finally {
            setSubmitting(false);
        }
    };

    if (!token) {
        return <Navigate to="/" />;
    }

    return (
        <>
            <main className="main-publish">
                <div className="container">
                    <h1>Vends ton article</h1>
                    {published ? (
                        <p className="publish-confirmation">Ton article est en ligne !</p>
                    ) : (
                        <>
                            <ErrorMessage error={error} />
                            <form onSubmit={handleSubmit}>
                                <section className="publish-pictures">
                                    <label htmlFor="picture">Ajoute une photo</label>
                                    <input
                                        type="file"
                                        name="picture"
                                        id="picture"
                                        accept="image/*"
                                        onChange={event => {
                                            const file = event.target.files[0] ?? null;
                                            setPicture(file);
                                            // Clear only the message this input resolves, so a
                                            // backend error survives until the seller retries.
                                            if (file) {
                                                setError(prev =>
                                                    prev === MISSING_PICTURE ? null : prev,
                                                );
                                            }
                                        }}
                                    />

                                    <label htmlFor="pictures">
                                        Ajoute jusqu&apos;à {MAX_SECONDARY_PICTURES} photos
                                        supplémentaires
                                    </label>
                                    <input
                                        type="file"
                                        name="pictures"
                                        id="pictures"
                                        accept="image/*"
                                        multiple
                                        onChange={event => {
                                            const files = Array.from(event.target.files);
                                            setPictures(files);
                                            setError(prev => {
                                                if (files.length > MAX_SECONDARY_PICTURES) {
                                                    return TOO_MANY_PICTURES;
                                                }
                                                return prev === TOO_MANY_PICTURES ? null : prev;
                                            });
                                        }}
                                    />
                                    {pictures.length > 0 && (
                                        <ul className="publish-picture-names">
                                            {pictures.map((file, index) => (
                                                <li key={`${file.name}-${index}`}>{file.name}</li>
                                            ))}
                                        </ul>
                                    )}
                                </section>

                                <section>
                                    <label htmlFor="title">Titre</label>
                                    <input
                                        type="text"
                                        name="title"
                                        id="title"
                                        value={title}
                                        onChange={event => {
                                            setTitle(event.target.value);
                                        }}
                                        placeholder="ex: Chemise Sézane verte"
                                    />

                                    <label htmlFor="description">Décris ton article</label>
                                    <textarea
                                        type="text"
                                        name="description"
                                        id="description"
                                        rows="5"
                                        value={description}
                                        onChange={event => {
                                            setDescription(event.target.value);
                                        }}
                                        placeholder="ex: porté quelqes fois, taille correctement"
                                    ></textarea>
                                </section>

                                <section>
                                    <label htmlFor="brand">Marque</label>
                                    <input
                                        type="text"
                                        name="brand"
                                        id="brand"
                                        value={brand}
                                        onChange={event => {
                                            setBrand(event.target.value);
                                        }}
                                        placeholder="ex: Zara"
                                    />

                                    <label htmlFor="size">Taille</label>
                                    <input
                                        type="text"
                                        name="size"
                                        id="size"
                                        value={size}
                                        onChange={event => {
                                            setSize(event.target.value);
                                        }}
                                        placeholder="ex: L / 40 / 12"
                                    />

                                    <label htmlFor="color">Couleur</label>
                                    <input
                                        type="text"
                                        name="color"
                                        id="color"
                                        value={color}
                                        onChange={event => {
                                            setColor(event.target.value);
                                        }}
                                        placeholder="ex: Fushia"
                                    />

                                    <label htmlFor="condition">Etat</label>
                                    <input
                                        type="text"
                                        name="condition"
                                        id="condition"
                                        value={condition}
                                        onChange={event => {
                                            setCondition(event.target.value);
                                        }}
                                        placeholder="ex: Neuf avec étiquette"
                                    />

                                    <label htmlFor="city">Lieu</label>
                                    <input
                                        type="text"
                                        name="city"
                                        id="city"
                                        value={city}
                                        onChange={event => {
                                            setCity(event.target.value);
                                        }}
                                        placeholder="ex: Paris"
                                    />
                                </section>

                                <section>
                                    <label htmlFor="price">Prix</label>
                                    <input
                                        type="text"
                                        name="price"
                                        id="price"
                                        value={price}
                                        onChange={event => {
                                            setPrice(event.target.value);
                                        }}
                                        placeholder="0.00 €"
                                    />
                                </section>

                                <section>
                                    <button disabled={submitting}>
                                        {submitting ? 'Publication...' : 'Ajouter'}
                                    </button>
                                </section>
                            </form>
                        </>
                    )}
                </div>
            </main>
        </>
    );
};

export default Publish;
