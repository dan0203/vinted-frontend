import './Header.css';
import { Link, useNavigate } from 'react-router';
import Cookies from 'js-cookie';
import logo from '../../assets/images/logo-vinted.png';
import { HiMagnifyingGlass } from 'react-icons/hi2';

const Header = ({ search, setSearch, handleToken }) => {
    const navigate = useNavigate();

    return (
        <header>
            <div className="container">
                <Link to="/">
                    <img src={logo} alt="Logo Vinted" />
                </Link>
                <div className="search">
                    <HiMagnifyingGlass className="magnifying-glass" />
                    <input type="text" name="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Recherche des articles" />
                </div>
                {Cookies.get('token') ? (
                    <button
                        className="logout"
                        onClick={() => {
                            // 1 : supprimer le cookie
                            handleToken(null);
                            // Cookies.remove('token');
                            // setIsConnected(false);
                            // 2 : rediriger vers Home
                            navigate('/');
                        }}
                    >
                        Se déconnecter
                    </button>
                ) : (
                    <div className="auth-buttons">
                        <Link to="/signup">
                            <button>S'inscrire</button>
                        </Link>
                        <Link to="/login">
                            <button>Se connecter</button>
                        </Link>
                    </div>
                )}
                <Link to="/publish">
                    <button>Vends tes articles</button>
                </Link>
            </div>
        </header>
    );
};

export default Header;
