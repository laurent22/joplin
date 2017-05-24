const React = require('react');
const {
  Dimensions,
  StyleSheet,
  ScrollView,
  View,
  Image,
  Text,
} = require('react-native');
const { Component } = React;

const window = Dimensions.get('window');
const uri = 'https://pickaface.net/gallery/avatar/Opi51c74d0125fd4.png';

const styles = StyleSheet.create({
  menu: {
    flex: 1,
    width: window.width,
    height: window.height,
    backgroundColor: 'gray',
    padding: 20,
  },
  avatarContainer: {
    marginBottom: 20,
    marginTop: 20,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    flex: 1,
  },
  name: {
    position: 'absolute',
    left: 70,
    top: 20,
  },
  item: {
    fontSize: 14,
    fontWeight: '300',
    paddingTop: 5,
  },
});

module.exports = class Menu extends Component {
  static propTypes = {
    onItemSelected: React.PropTypes.func.isRequired,
  };

  render() {
    return (
      <ScrollView scrollsToTop={false} style={styles.menu}>
        <View style={styles.avatarContainer}>
          <Image
            style={styles.avatar}
            source={{ uri, }}/>
          <Text style={styles.name}>Your name</Text>
        </View>

        <Text
          onPress={() => this.props.onItemSelected('About')}
          style={styles.item}>
          About
        </Text>

        <Text
          onPress={() => this.props.onItemSelected('Contacts')}
          style={styles.item}>
          Contacts
        </Text>

        <Text style={styles.item}>Contacts</Text>
        <Text style={styles.item}>Contacts</Text>
        <Text style={styles.item}>Contacts</Text>
        <Text style={styles.item}>Contacts</Text>
        <Text style={styles.item}>Contacts</Text>
        <Text style={styles.item}>Contacts</Text>
        <Text style={styles.item}>Contacts</Text>
        <Text style={styles.item}>Contacts</Text>
        <Text style={styles.item}>Contacts</Text>
        <Text style={styles.item}>Contacts</Text>
        <Text style={styles.item}>Contacts</Text>
        <Text style={styles.item}>Contacts</Text>
        <Text style={styles.item}>Contacts</Text>
        <Text style={styles.item}>Contacts</Text>
        <Text style={styles.item}>Contacts</Text>
        <Text style={styles.item}>Contacts</Text>
        <Text style={styles.item}>Contacts</Text>
        <Text style={styles.item}>Contacts</Text>
        <Text style={styles.item}>Contacts</Text>
        <Text style={styles.item}>Contacts</Text>
        <Text style={styles.item}>Contacts</Text>
        <Text style={styles.item}>Contacts</Text>
        <Text style={styles.item}>Contacts</Text>
        <Text style={styles.item}>Contacts</Text>
        <Text style={styles.item}>Contacts</Text>
        <Text style={styles.item}>ContactsLL</Text>
      </ScrollView>
    );
  }
};