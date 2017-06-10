import React, { Component } from 'react';
import './App.css';
import { Models } from './service/Models';
import styled from 'styled-components';

const createBook = () =>
  Models.Book.create({
    name: `book-${Math.floor(Math.random() * 100)}`,
  });
const createShelf = () =>
  Models.Shelf.create({
    name: `shelf-${Math.floor(Math.random() * 100)}`,
  });
const moveToShelf = (id, currentShelfId, newShelfId) => {
  if (currentShelfId) {
    Models.Shelf.removeBook(currentShelfId, id);
  }
  Models.Shelf.addBook(newShelfId, id);
};
const destroyBook = id => Models.Book.destroy(id);

const ShelfContainer = styled.div`
  display: flex;
  justify-content: space-around;
`;

const BookContainer = styled.div`
  display: flex;
  flex-direction: column;
`;

class Book extends Component {
  state = {
    book: null,
    shelves: {},
  };
  listeners = [];
  componentDidMount() {
    const { itemId } = this.props;
    this.listeners.push(
      Models.Book.createListStream(
        book => this.setState({ book }),
        ref => ref.child(itemId)
      )
    );
    this.listeners.push(
      Models.Shelf.createListStream(shelves =>
        this.setState({ shelves: shelves || {} })
      )
    );
  }
  componentWillUnmount() {
    this.listeners.forEach(fn => fn());
  }
  destroy = () => {
    const { itemId } = this.props;
    destroyBook(itemId);
  };
  moveToShelf = moveToShelf.bind(null, this.props.itemId, this.props.shelfId);
  render() {
    if (!this.state.book) return null;
    const { shelves, book } = this.state;
    if (!book) return null;
    const { name } = book;
    const sKeys = Object.keys(shelves);
    return (
      <div>
        Book - {name}
        <div>
          <button onClick={this.destroy}>Destroy</button>
          {sKeys.map(k =>
            <button key={k} onClick={() => this.moveToShelf(k)}>
              Move to {shelves[k].name}
            </button>
          )}
        </div>
      </div>
    );
  }
}

class Shelf extends Component {
  state = {
    books: {},
  };
  listeners = [];
  componentDidMount = () => {
    const { itemId } = this.props;
    this.listeners.push(
      Models.Shelf.BookJoinStream(
        books => this.setState({ books: books || {} }),
        ref => ref.child(itemId)
      )
    );
  };
  componentWillUnmount() {
    this.listeners.forEach(fn => fn());
  }
  render() {
    const { name, itemId } = this.props;
    const keys = Object.keys(this.state.books);
    return (
      <div>
        {name}
        <BookContainer>
          {keys.map(bId => <Book key={bId} itemId={bId} shelfId={itemId} />)}
        </BookContainer>
      </div>
    );
  }
}

class Shelves extends Component {
  state = {
    shelves: {},
  };
  listeners = [];
  componentDidMount = () => {
    this.listeners.push(
      Models.Shelf.createListStream(shelves =>
        this.setState({ shelves: shelves || {} })
      )
    );
  };
  componentWillUnmount() {
    this.listeners.forEach(fn => fn());
  }
  render() {
    const { shelves } = this.state;
    const keys = Object.keys(shelves);
    return (
      <div>
        Shelves
        <ShelfContainer>
          {keys.map(k => <Shelf key={k} {...shelves[k]} itemId={k} />)}
        </ShelfContainer>
      </div>
    );
  }
}

class App extends Component {
  state = { books: {}, shelves: {} };
  listeners = [];
  componentDidMount = () => {
    this.listeners.push(
      Models.Book.createListStream(
        books => this.setState({ books: books || {} }),
        ref => ref.limitToFirst(3)
      )
    );
  };
  componentWillUnmount() {
    this.listeners.forEach(fn => fn());
  }
  destroyBook(id) {
    Book.destroy(id);
  }
  render() {
    const { books } = this.state;
    const bkeys = Object.keys(books);
    return (
      <div className="App">
        <button type="button" onClick={createBook}>Create Book</button>
        <button type="button" onClick={createShelf}>Create Shelf</button>
        <Shelves />
        <div>
          {bkeys.map(k => <Book key={k} itemId={k} />)}
        </div>
      </div>
    );
  }
}

export default App;
