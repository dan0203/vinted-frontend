import './Publish.css';
import { useState } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';

const Publish = () => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [brand, setBrand] = useState('');
    const [size, setSize] = useState('');
    const [color, setColor] = useState('');
    const [condition, setCondition] = useState('');
    const [city, setCity] = useState('');
    const [price, setPrice] = useState('');
    const [newsletter, setNewsletter] = useState(false);
    const [file, setFile] = useState({});

    return (
        <>
            <main className="main-publish">
                <div className="container">
                    <h1>Vends ton article</h1>
                    <form
                        onSubmit={async event => {
                            event.preventDefault();

                            const formData = new FormData();
                            formData.append('picture', file);
                            formData.append('title', title);
                            formData.append('description', description);
                            formData.append('price', price);
                            formData.append('brand', brand);
                            formData.append('size', size);
                            formData.append('color', color);
                            formData.append('condition', condition);
                            formData.append('city', city);

                            try {
                                const token = Cookies.get('token');
                                const response = await axios.post(import.meta.env.VITE_API_URL + '/offers/publish', formData, {
                                    headers: {
                                        authorization: `Bearer ${token ? token : ''}`,
                                    },
                                });

                                console.log(response.data);
                            } catch (error) {
                                error.message && console.log('error.message', error.message);
                                error.response && console.log('error.response.data', error.response.data);
                            }
                        }}
                    >
                        <section>
                            <input type="file" onChange={event => setFile(event.target.files[0])} />
                            <label htmlFor="picture">Ajoute une photo</label>
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

                            <input
                                type="checkbox"
                                name="newsletter"
                                id="newsletter"
                                checked={newsletter}
                                onChange={event => {
                                    setNewsletter(event.target.checked);
                                }}
                            />
                            <label htmlFor="newsletter">Je suis intéressé(e) par les échanges</label>
                        </section>

                        <section>
                            <button>Ajouter</button>
                        </section>
                    </form>
                </div>
            </main>
        </>
    );
};

export default Publish;
