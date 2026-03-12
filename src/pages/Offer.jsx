import { useParams } from 'react-router';
import { useState, useEffect } from 'react';
import axios from 'axios';

const Offer = () => {
    const params = useParams();
    const [offer, setOffer] = useState({});
    const [isLoading, setisLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            const response = await axios.get(import.meta.env.VITE_API_URL + '/offer/' + params.id);
            const offerToDisplay = response.data;
            offerToDisplay.productDetails = [];

            for (let i = 0; i < offerToDisplay.product_details.length; i++) {
                offerToDisplay.productDetails.push([Object.entries(offerToDisplay.product_details[i])[0][0], Object.entries(offerToDisplay.product_details[i])[0][1]]);
            }

            setOffer(offerToDisplay);
            setisLoading(false);
        };

        fetchData();
    }, []);

    return isLoading ? (
        <p className="loading">Chargement en cours...</p>
    ) : (
        <>
            <main className="main-offer">
                <div className="container">
                    <img src={offer.product_image.url} alt={offer.product_name} />
                    <aside>
                        <p className="product_price">{offer.product_price} €</p>
                        <div className="product_details_wrapper">
                            {offer.productDetails.map(p => (
                                <div key={`${p[0]} ${p[1]}`} className="product_details">
                                    <p className="product_details_key">{p[0]}</p>
                                    <p className="product_details_value">{p[1]}</p>
                                </div>
                            ))}
                        </div>
                        <p className="product_name">{offer.product_name}</p>
                        <p className="product_description">{offer.product_description}</p>
                        <p className="user-info">
                            <img src={offer.owner.account.avatar.url} alt={offer.owner.account.username} />
                            <span>{offer.owner.account.username}</span>
                        </p>
                        <button>Acheter</button>
                    </aside>
                </div>
            </main>
        </>
    );
};

export default Offer;
