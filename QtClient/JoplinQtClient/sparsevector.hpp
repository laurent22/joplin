#ifndef SPARSEARRAY_HPP
#define SPARSEARRAY_HPP

#include <algorithm>
#include <iostream>
#include <map>
#include <vector>
#include <math.h>

template <class ClassType> class SparseVector {

public:

	SparseVector() {
		counter_ = -1;
		count_ = -1;
	}

	ClassType get(int index) const {
		if (index > count()) return ClassType();
		if (!isset(index)) return ClassType();

		typename IndexMap::const_iterator pos = indexes_.find(index);
		int valueIndex = pos->second.valueIndex;

		typename std::map<int, ClassType>::const_iterator pos2 = values_.find(valueIndex);
		return pos2->second;
	}

	void set(int index, ClassType value) {
		unset(index);
		int valueIndex = ++counter_;
		values_[valueIndex] = value;
		IndexRecord r;
		r.valueIndex = valueIndex;
		r.time = 0; // Disabled / not needed
		//r.time = time(0);
		indexes_[index] = r;
		count_ = -1;
	}

	void push(ClassType value) {
		set(count(), value);
	}

	bool isset(int index) const {
		return indexes_.find(index) != indexes_.end();
	}

	std::vector<int> indexes() const {
		std::vector<int> output;
		for (typename IndexMap::const_iterator it = indexes_.begin(); it != indexes_.end(); ++it) {
			output.push_back(it->first);
		}
		return output;
	}

	// Unsets that particular index, but without shifting the following indexes
	void unset(int index) {
		if (!isset(index)) return;
		IndexRecord r = indexes_[index];
		values_.erase(r.valueIndex);
		indexes_.erase(index);
	}

	void insert(int index, ClassType value) {
		IndexMap newIndexes;
		for (typename IndexMap::const_iterator it = indexes_.begin(); it != indexes_.end(); ++it) {
			ClassType key = it->first;
			if (key > index) key++;
			newIndexes[key] = it->second;
		}
		indexes_ = newIndexes;
		set(index, value);
	}

	// Removes the element at that particular index, and shift all the following elements
	void remove(int index) {
		if (index > count()) return;

		if (isset(index)) {
			int valueIndex = indexes_[index].valueIndex;
			values_.erase(valueIndex);
		}

		IndexMap newIndexes;
		for (typename IndexMap::const_iterator it = indexes_.begin(); it != indexes_.end(); ++it) {
			ClassType key = it->first;
			if (key == index) continue;
			if (key > index) key--;
			newIndexes[key] = it->second;
		}
		indexes_ = newIndexes;
		count_ = -1;
	}

	// Returns a vector containing the indexes that are not currently set around
	// the given index, up to bufferSize indexes.
	std::vector<int> availableBufferAround(int index, size_t bufferSize) const {
		std::vector<int> temp;

		// Doesn't make sense to search for an empty buffer around
		// an index that is already set.
		if (isset(index)) return temp;

		temp.push_back(index);

		// Probably not the most efficient algorithm but it works:
		// First search 1 position to the left, then 1 position to the right,
		// then 2 to the left, etc. If encountering an unavailable index on one
		// of the side, the path is "blocked" and searching is now done in only
		// one direction. If both sides are blocked, the algorithm exit.

		int inc = 1;
		int sign = -1;
		bool leftBlocked = false;
		bool rightBlocked = false;
		while (temp.size() < bufferSize) {
			int bufferIndex = index + (inc * sign);

			bool blocked = isset(bufferIndex) || bufferIndex < 0;
			if (blocked) {
				if (sign < 0) {
					leftBlocked = true;
				} else {
					rightBlocked = true;
				}
			}

			if (leftBlocked && rightBlocked) break;

			if (!blocked) temp.push_back(bufferIndex);

			sign = -sign;
			if (sign < 0) inc++;
			if (leftBlocked && sign < 0) sign = 1;
			if (rightBlocked && sign > 0) sign = -1;
		}

		std::sort(temp.begin(), temp.end());

		return temp;
	}

	int count() const {
		if (count_ >= 0) return count_;
		int maxKey = -1;
		for (typename IndexMap::const_iterator it = indexes_.begin(); it != indexes_.end(); ++it) {
			const int& key = it->first;
			if (key > maxKey) maxKey = key;
		}
		count_ = maxKey + 1;
		return count_;
	}

	void clearOlderThan(time_t time) {
		IndexMap newIndexes;
		for (typename IndexMap::const_iterator it = indexes_.begin(); it != indexes_.end(); ++it) {
			const IndexRecord& r = it->second;
			if (r.time > time) {
				newIndexes[it->first] = r;
			} else {
				values_.erase(r.valueIndex);
			}
		}
		indexes_ = newIndexes;
		count_ = -1;
	}

	// Unset all values outside of this interval
	void unsetAllButInterval(int intervalFrom, int intervalTo) {
		int count = this->count();
		for (int i = 0; i < count; i++) {
			if (i >= intervalFrom && i <= intervalTo) continue;
			unset(i);
		}
	}

	void clear() {
		indexes_.clear();
		values_.clear();
		counter_ = 0;
		count_ = -1;
	}

	void print() const {
		for (int i = 0; i < count(); i++) {
			std::cout << "|";
			std::cout << " " << get(i) << " ";
		}
	}

private:

	struct IndexRecord {
		int valueIndex;
		time_t time;
	};

	typedef std::map<int, IndexRecord> IndexMap;

	int counter_;
	IndexMap indexes_;
	std::map<int, ClassType> values_;

	// This is used to cache the result of ::count().
	// Don't forget to set it to -1 whenever the list
	// size changes, so that it can be recalculated.
	mutable int count_;

};

#endif // SPARSEARRAY_HPP
