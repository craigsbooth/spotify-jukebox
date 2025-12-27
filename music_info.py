import spotipy
from spotipy.oauth2 import SpotifyClientCredentials
import argparse
import sys

# --- CONFIGURATION ---
CLIENT_ID = '3c5e00fa03dc46109048d2905f87332e'
CLIENT_SECRET = '0035087b530a4a30a447a280cbb9b9fd'
# ---------------------

def get_music_data(query_text):
    try:
        auth_manager = SpotifyClientCredentials(client_id=CLIENT_ID, client_secret=CLIENT_SECRET)
        sp = spotipy.Spotify(auth_manager=auth_manager)

        # Search for the track
        results = sp.search(q=query_text, type='track', limit=1)

        if not results['tracks']['items']:
            print(f"\n[!] No results found for: {query_text}")
            return

        track = results['tracks']['items'][0]
        album_id = track['album']['id']
        
        # Get full album details for the 'label' field
        album_details = sp.album(album_id)

        # Print Results to Terminal
        print("\n" + "="*50)
        print(f"SONG:   {track['name']}")
        print(f"ARTIST: {track['artists'][0]['name']}")
        print(f"ALBUM:  {track['album']['name']}")
        print("-" * 50)
        print(f"LABEL:  {album_details.get('label', 'N/A')}")
        print(f"COVER:  {track['album']['images'][0]['url']}") # Largest image
        print("="*50 + "\n")

    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Fetch song cover and label from Spotify.")
    parser.add_argument("song", help="The name of the song (and artist for better accuracy)")
    
    # If no arguments are passed, show help
    if len(sys.argv) == 1:
        parser.print_help(sys.stderr)
        sys.exit(1)

    args = parser.parse_args()
    get_music_data(args.song)