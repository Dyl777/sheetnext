/**
 * Mini NoSQL Document Store
 * Lightweight JSON-based document database (like a mini MongoDB)
 */

import fs from 'fs';
import path from 'path';

export default class MiniNoSQLStore {
  constructor(options = {}) {
    this.dataPath = options.dataPath || path.join(process.cwd(), 'data', 'nosql');
    this.collections = new Map();
    this.writeQueue = [];
    this.isWriting = false;
    
    // Ensure data directory exists
    if (!fs.existsSync(this.dataPath)) {
      fs.mkdirSync(this.dataPath, { recursive: true });
    }
    
    // Load existing collections
    this._loadCollections();
    
    // Start write queue processor
    this._startWriteProcessor();
  }

  /**
   * Load existing collections from disk
   */
  _loadCollections() {
    try {
      const files = fs.readdirSync(this.dataPath);
      files.forEach(file => {
        if (file.endsWith('.json')) {
          const collectionName = file.slice(0, -5);
          const filePath = path.join(this.dataPath, file);
          const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          
          this.collections.set(collectionName, {
            documents: data.documents || [],
            indexes: data.indexes || {},
            metadata: data.metadata || {}
          });
        }
      });
      console.log('NoSQL Store: Loaded', this.collections.size, 'collections');
    } catch (error) {
      console.error('NoSQL Store: Load failed:', error.message);
    }
  }

  /**
   * Get or create collection
   */
  collection(name) {
    if (!this.collections.has(name)) {
      this.collections.set(name, {
        documents: [],
        indexes: {},
        metadata: {
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      });
      this._scheduleWrite(name);
    }
    return new CollectionWrapper(this, name);
  }

  /**
   * Schedule collection write to disk
   */
  _scheduleWrite(collectionName) {
    this.writeQueue.push(collectionName);
  }

  /**
   * Process write queue
   */
  async _startWriteProcessor() {
    setInterval(async () => {
      if (this.isWriting || this.writeQueue.length === 0) return;
      
      this.isWriting = true;
      const collectionsToWrite = [...new Set(this.writeQueue)];
      this.writeQueue = [];
      
      for (const name of collectionsToWrite) {
        await this._writeCollection(name);
      }
      
      this.isWriting = false;
    }, 1000); // Write every second
  }

  /**
   * Write collection to disk
   */
  async _writeCollection(name) {
    try {
      const collection = this.collections.get(name);
      if (!collection) return;
      
      collection.metadata.updatedAt = Date.now();
      
      const filePath = path.join(this.dataPath, `${name}.json`);
      const data = {
        documents: collection.documents,
        indexes: collection.indexes,
        metadata: collection.metadata
      };
      
      // Atomic write using temp file
      const tempPath = filePath + '.tmp';
      fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf8');
      fs.renameSync(tempPath, filePath);
    } catch (error) {
      console.error('NoSQL Store: Write failed for', name, error.message);
    }
  }

  /**
   * Get all collection names
   */
  listCollections() {
    return Array.from(this.collections.keys());
  }

  /**
   * Delete collection
   */
  dropCollection(name) {
    if (this.collections.has(name)) {
      this.collections.delete(name);
      const filePath = path.join(this.dataPath, `${name}.json`);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return true;
    }
    return false;
  }

  /**
   * Get database stats
   */
  getStats() {
    const stats = {
      collections: {},
      totalDocuments: 0,
      totalSize: 0
    };
    
    for (const [name, collection] of this.collections) {
      const size = JSON.stringify(collection.documents).length;
      stats.collections[name] = {
        documents: collection.documents.length,
        size: size,
        indexes: Object.keys(collection.indexes).length
      };
      stats.totalDocuments += collection.documents.length;
      stats.totalSize += size;
    }
    
    stats.backend = 'mininosql';
    stats.dataPath = this.dataPath;
    
    return stats;
  }

  /**
   * Export all data
   */
  export() {
    const data = {};
    for (const [name, collection] of this.collections) {
      data[name] = collection.documents;
    }
    return JSON.stringify({
      exportedAt: new Date().toISOString(),
      backend: 'mininosql',
      collections: data
    }, null, 2);
  }

  /**
   * Import data
   */
  import(json) {
    try {
      const data = JSON.parse(json);
      let count = 0;
      
      const collections = data.collections || data;
      for (const [name, documents] of Object.entries(collections)) {
        if (Array.isArray(documents)) {
          const collection = this.collection(name);
          documents.forEach(doc => {
            collection.insert(doc);
            count++;
          });
        }
      }
      
      return count;
    } catch (error) {
      console.error('NoSQL Store: Import failed:', error.message);
      return 0;
    }
  }

  /**
   * Close and flush all writes
   */
  async close() {
    // Flush write queue
    while (this.writeQueue.length > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Write all collections
    for (const name of this.collections.keys()) {
      await this._writeCollection(name);
    }
    
    console.log('NoSQL Store: Closed, all data persisted');
  }
}

/**
 * Collection wrapper for CRUD operations
 */
class CollectionWrapper {
  constructor(store, name) {
    this.store = store;
    this.name = name;
  }

  /**
   * Get collection data
   */
  get _collection() {
    return this.store.collections.get(this.name);
  }

  /**
   * Insert document
   */
  insert(doc) {
    const collection = this._collection;
    const document = {
      _id: this._generateId(),
      _createdAt: Date.now(),
      _updatedAt: Date.now(),
      ...doc
    };
    
    collection.documents.push(document);
    this.store._scheduleWrite(this.name);
    
    return document;
  }

  /**
   * Insert many documents
   */
  insertMany(docs) {
    return docs.map(doc => this.insert(doc));
  }

  /**
   * Find documents
   */
  find(query = {}, options = {}) {
    const collection = this._collection;
    let results = [...collection.documents];
    
    // Apply query filters
    results = this._applyQuery(results, query);
    
    // Apply sorting
    if (options.sort) {
      results = this._applySort(results, options.sort);
    }
    
    // Apply limit and skip
    if (options.skip) {
      results = results.slice(options.skip);
    }
    if (options.limit) {
      results = results.slice(0, options.limit);
    }
    
    // Apply projection
    if (options.projection) {
      results = results.map(doc => this._applyProjection(doc, options.projection));
    }
    
    return results;
  }

  /**
   * Find one document
   */
  findOne(query = {}) {
    const results = this.find(query, { limit: 1 });
    return results[0] || null;
  }

  /**
   * Find by ID
   */
  findById(id) {
    return this.findOne({ _id: id });
  }

  /**
   * Update documents
   */
  update(query, update, options = {}) {
    const collection = this._collection;
    let updated = 0;
    
    for (const doc of collection.documents) {
      if (this._matchesQuery(doc, query)) {
        this._applyUpdate(doc, update);
        doc._updatedAt = Date.now();
        updated++;
        
        if (!options.multi) break;
      }
    }
    
    if (updated > 0) {
      this.store._scheduleWrite(this.name);
    }
    
    return { matched: collection.documents.filter(d => this._matchesQuery(d, query)).length, modified: updated };
  }

  /**
   * Update by ID
   */
  updateById(id, update) {
    return this.update({ _id: id }, update);
  }

  /**
   * Delete documents
   */
  delete(query, options = {}) {
    const collection = this._collection;
    const initialLength = collection.documents.length;
    
    collection.documents = collection.documents.filter(doc => {
      if (this._matchesQuery(doc, query)) {
        if (!options.multi) {
          options.multi = true;
          return false;
        }
        return false;
      }
      return true;
    });
    
    const deleted = initialLength - collection.documents.length;
    if (deleted > 0) {
      this.store._scheduleWrite(this.name);
    }
    
    return deleted;
  }

  /**
   * Delete by ID
   */
  deleteById(id) {
    return this.delete({ _id: id });
  }

  /**
   * Count documents
   */
  count(query = {}) {
    return this.find(query).length;
  }

  /**
   * Create index
   */
  createIndex(field, options = {}) {
    const collection = this._collection;
    collection.indexes[field] = {
      type: options.type || 'ascending',
      unique: options.unique || false,
      createdAt: Date.now()
    };
    this.store._scheduleWrite(this.name);
    return true;
  }

  /**
   * Aggregate pipeline
   */
  aggregate(pipeline) {
    let results = [...this._collection.documents];
    
    for (const stage of pipeline) {
      if (stage.$match) {
        results = this._applyQuery(results, stage.$match);
      } else if (stage.$sort) {
        results = this._applySort(results, stage.$sort);
      } else if (stage.$limit) {
        results = results.slice(0, stage.$limit);
      } else if (stage.$skip) {
        results = results.slice(stage.$skip);
      } else if (stage.$project) {
        results = results.map(doc => this._applyProjection(doc, stage.$project));
      } else if (stage.$group) {
        results = this._applyGroup(results, stage.$group);
      }
    }
    
    return results;
  }

  // Helper methods

  _generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  _matchesQuery(doc, query) {
    for (const [key, value] of Object.entries(query)) {
      const docValue = this._getNestedValue(doc, key);
      
      if (typeof value === 'object' && value !== null) {
        // Operator query
        for (const [op, opValue] of Object.entries(value)) {
          if (!this._applyOperator(docValue, op, opValue)) {
            return false;
          }
        }
      } else if (docValue !== value) {
        return false;
      }
    }
    return true;
  }

  _applyQuery(docs, query) {
    return docs.filter(doc => this._matchesQuery(doc, query));
  }

  _applyOperator(docValue, op, opValue) {
    switch (op) {
      case '$eq': return docValue === opValue;
      case '$ne': return docValue !== opValue;
      case '$gt': return docValue > opValue;
      case '$gte': return docValue >= opValue;
      case '$lt': return docValue < opValue;
      case '$lte': return docValue <= opValue;
      case '$in': return Array.isArray(opValue) && opValue.includes(docValue);
      case '$nin': return !Array.isArray(opValue) || !opValue.includes(docValue);
      case '$exists': return opValue ? docValue !== undefined : docValue === undefined;
      case '$regex': return new RegExp(opValue).test(docValue);
      case '$contains': return Array.isArray(docValue) && docValue.includes(opValue);
      default: return docValue === opValue;
    }
  }

  _applySort(docs, sort) {
    return docs.sort((a, b) => {
      for (const [field, direction] of Object.entries(sort)) {
        const aVal = this._getNestedValue(a, field);
        const bVal = this._getNestedValue(b, field);
        
        if (aVal < bVal) return direction === 1 ? -1 : 1;
        if (aVal > bVal) return direction === 1 ? 1 : -1;
      }
      return 0;
    });
  }

  _applyProjection(doc, projection) {
    const result = {};
    for (const [field, include] of Object.entries(projection)) {
      if (include && field !== '_id') {
        result[field] = this._getNestedValue(doc, field);
      }
    }
    if (projection._id !== 0) {
      result._id = doc._id;
    }
    return result;
  }

  _applyUpdate(doc, update) {
    if (update.$set) {
      for (const [key, value] of Object.entries(update.$set)) {
        this._setNestedValue(doc, key, value);
      }
    }
    if (update.$unset) {
      for (const key of Object.keys(update.$unset)) {
        this._setNestedValue(doc, key, undefined);
      }
    }
    if (update.$inc) {
      for (const [key, value] of Object.entries(update.$inc)) {
        const current = this._getNestedValue(doc, key) || 0;
        this._setNestedValue(doc, key, current + value);
      }
    }
    if (update.$push) {
      for (const [key, value] of Object.entries(update.$push)) {
        const arr = this._getNestedValue(doc, key) || [];
        if (Array.isArray(arr)) {
          arr.push(value);
          this._setNestedValue(doc, key, arr);
        }
      }
    }
    if (update.$pull) {
      for (const [key, value] of Object.entries(update.$pull)) {
        const arr = this._getNestedValue(doc, key);
        if (Array.isArray(arr)) {
          this._setNestedValue(doc, key, arr.filter(item => item !== value));
        }
      }
    }
  }

  _applyGroup(docs, group) {
    const groups = new Map();
    
    for (const doc of docs) {
      const key = group._id ? this._getNestedValue(doc, group._id) || 'null' : 'all';
      
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key).push(doc);
    }
    
    const results = [];
    for (const [key, groupDocs] of groups) {
      const result = { _id: key };
      
      for (const [field, expr] of Object.entries(group)) {
        if (field === '_id') continue;
        
        if (expr.$sum) {
          result[field] = groupDocs.reduce((sum, d) => sum + (this._getNestedValue(d, expr.$sum) || 0), 0);
        } else if (expr.$avg) {
          result[field] = groupDocs.reduce((sum, d) => sum + (this._getNestedValue(d, expr.$avg) || 0), 0) / groupDocs.length;
        } else if (expr.$count) {
          result[field] = groupDocs.length;
        } else if (expr.$max) {
          result[field] = Math.max(...groupDocs.map(d => this._getNestedValue(d, expr.$max) || 0));
        } else if (expr.$min) {
          result[field] = Math.min(...groupDocs.map(d => this._getNestedValue(d, expr.$min) || 0));
        }
      }
      
      results.push(result);
    }
    
    return results;
  }

  _getNestedValue(obj, path) {
    return path.split('.').reduce((o, k) => o?.[k], obj);
  }

  _setNestedValue(obj, path, value) {
    const parts = path.split('.');
    const last = parts.pop();
    const target = parts.reduce((o, k) => o[k] = o[k] || {}, obj);
    target[last] = value;
  }
}
