import { useParams } from 'react-router';

const Offer = ({ offers }) => {
    const params = useParams();
    let offer = {};

    for (let i = 0; i < offers.length; i++) {
        if (offers[i]._id === params.id) {
            offer = offers[i];
            break;
        }
    }

    const productDetails = [];

    for (let i = 0; i < offer.product_details.length; i++) {
        productDetails.push([[Object.entries(offer.product_details[i])[0][0], Object.entries(offer.product_details[i])[0][1]]]);
    }

    return (
        <main className="main-offer">
            <div className="container">
                <img src={offer.product_image.url} alt={offer.product_name} />
                <aside>
                    <p>{offer.product_price} €</p>
                    {productDetails.map(p => (
                        <div key={`${p[0]} ${p[1]}`}>
                            <p>{p[0]}</p>
                            <p>{p[1]}</p>
                        </div>
                    ))}
                    <p>{offer.product_name}</p>
                    <p>{offer.product_description}</p>
                    <p className="user-info">
                        <img src={offer.owner.account.avatar.url} alt={offer.owner.account.username} />
                        <span>{offer.owner.account.username}</span>
                    </p>
                    <button>Acheter</button>
                </aside>
            </div>
        </main>
    );
};

export default Offer;
