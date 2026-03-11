import logo from '../assets/logo-vinted.png';
import { HiMagnifyingGlass } from 'react-icons/hi2';

const Header = ({ search, setSearch }) => {
    return (
        <header>
            <div className="container">
                <img src={logo} alt="Logo Vinted" />
                <div className="search">
                    <HiMagnifyingGlass className="magnifying-glass" />
                    <input type="text" name="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Recherche des articles" />
                </div>
                <div className="auth-buttons">
                    <button>S'inscrire</button>
                    <button>Se connecter</button>
                </div>
                <button>Vends tes articles</button>
            </div>
        </header>
    );
};

export default Header;
