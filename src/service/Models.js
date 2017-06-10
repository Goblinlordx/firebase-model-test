const { firebase } = window;

const login = () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  firebase.auth().signInWithPopup(provider);
};
window.login = login;

const root = firebase.database().ref();
const Models = {};

const joinTableName = (A, B) => `${A.name}${B.name}`;

class Model {
  joins = {};
  constructor(name) {
    if (!name) throw new Error('Invalid model name');
    if (Models[name]) throw new Error(`Model ${name} already exists`);
    Models[name] = this;
    this.name = name;
    this.ref = root.child(name);
  }
  create(item) {
    return this.ref.push(item);
  }
  createListStream = (cb, queryFn) => {
    if (!cb && typeof cb !== 'function') throw new Error('Invalid callback');
    const ref = queryFn && typeof queryFn === 'function'
      ? queryFn(this.ref)
      : this.ref;
    const handleRef = ref.on('value', snap => cb(snap.val()));
    return () => ref.off('value', handleRef);
  };
  destroy(id) {
    this.ref.child(id).set(null);
  }
  setJoin = (model, cascade = false) => {
    const childName = model.name;
    const name = joinTableName(this, model);
    const joinTable = new Model(name);
    this.joins[childName] = joinTable;
    this[`add${childName}`] = (parentId, childId) =>
      joinTable.ref.child(`${parentId}/${childId}`).set(true);
    this[`remove${childName}`] = (parentId, childId) =>
      joinTable.ref.child(`${parentId}/${childId}`).set(null);
    this[`set${childName}`] = (parentId, childId) =>
      joinTable.ref.child(parentId).set({ [childId]: true });
    this[`unset${childName}`] = parentId => joinTable.ref(parentId).set(null);
    this[`${childName}JoinStream`] = joinTable.createListStream;
    this[`${childName}Stream`] = this.itemChildStream.bind(model);
    if (cascade) {
      const destroy = this.destroy.bind(this);
      this.destroy = id => {
        joinTable.destroy(id);
        destroy(id);
      };
    }
  };
  itemChildStream = (model, cb, id) => {
    const childName = model.name;
    if (!this.joins[childName]) {
      throw new Error(
        `Model: ${model.name} is not currently joined with ${this.name}`
      );
    }
    const joinTable = this.joins[childName];
    let listeners = {};
    let merged = {};
    const merge = (k, v) => {
      if (!v) {
        listeners = Object.keys(listeners).reduce((a, kk) => {
          if (k === kk) {
            listeners[k]();
            return a;
          }
          a[k] = listeners;
          return a;
        }, {});
        merged = Object.keys(merged).reduce((a, kk) => {
          if (k === kk) {
            return a;
          }
          a[k] = a[k];
          return a;
        }, {});
      }
      merged[k] = v;
      return cb(merged);
    };
    const topListener = joinTable.createStream(
      val => {
        listeners = Object.keys(listeners).reduce((a, k) => {
          if (!val[k]) {
            listeners[k]();
            return a;
          }
          a[k] = listeners[k];
          return a;
        }, {});
        Object.keys(val).forEach(k => {
          if (listeners[k]) return;
          listeners[k] = model.createStream(
            subVal => merge(k, subVal),
            ref => ref.child(k)
          );
        });
      },
      ref => ref.child(id)
    );
    return () => {
      topListener();
      Object.keys(listeners).forEach(l => l());
    };
  };
}

const Book = new Model('Book');
const Shelf = new Model('Shelf');
Shelf.setJoin(Book);

export { Models };
